-- Etapa 1: campanhas na nuvem (uma linha por campanha) + histórico de versões.
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run.
-- O projeto foi criado com "Automatically expose new tables" desligado,
-- então toda permissão abaixo é explícita e só para usuários logados.

-- ---------- Campanhas ----------
create table public.campaigns (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  name       text        not null default '',
  data       jsonb       not null,
  version    integer     not null default 1,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

alter table public.campaigns enable row level security;

create policy "campaigns_select_own" on public.campaigns
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "campaigns_insert_own" on public.campaigns
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "campaigns_update_own" on public.campaigns
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Sem policy de DELETE: apagar = marcar deleted_at (recuperável).

grant select, insert, update on public.campaigns to authenticated;

-- ---------- Histórico ----------
create table public.campaign_history (
  history_id  bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  campaign_id text        not null,
  name        text        not null,
  data        jsonb       not null,
  version     integer     not null,
  saved_at    timestamptz not null,
  archived_at timestamptz not null default now()
);

create index campaign_history_lookup on public.campaign_history (user_id, campaign_id, history_id desc);

alter table public.campaign_history enable row level security;

create policy "history_select_own" on public.campaign_history
  for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.campaign_history to authenticated;

-- Guarda a versão anterior antes de cada update. No máximo um snapshot a cada
-- 10 min por campanha (senão o combate, que salva a cada poucos segundos,
-- empurraria o histórico útil para fora) + sempre ao apagar. Mantém os 50 últimos.
create function public.archive_campaign_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.deleted_at is not null and old.deleted_at is null)
     or not exists (
       select 1 from public.campaign_history h
       where h.user_id = old.user_id and h.campaign_id = old.id
         and h.archived_at > now() - interval '10 minutes'
     )
  then
    insert into public.campaign_history (user_id, campaign_id, name, data, version, saved_at)
    values (old.user_id, old.id, old.name, old.data, old.version, old.updated_at);

    delete from public.campaign_history h
    where h.user_id = old.user_id and h.campaign_id = old.id
      and h.history_id not in (
        select h2.history_id from public.campaign_history h2
        where h2.user_id = old.user_id and h2.campaign_id = old.id
        order by h2.history_id desc
        limit 50
      );
  end if;
  return new;
end;
$$;

revoke execute on function public.archive_campaign_version() from public, anon, authenticated;

create trigger campaigns_archive
  before update on public.campaigns
  for each row execute function public.archive_campaign_version();

-- ---------- Salvamento atômico ----------
-- p_expected_version = versão que o aparelho conhece (0 = campanha nova).
-- Só grava se a nuvem ainda estiver nessa versão; senão devolve saved = false
-- com a versão atual, e o app trata o conflito sem sobrescrever nada.
create function public.save_campaign(p_id text, p_name text, p_data jsonb, p_expected_version integer)
returns table (saved boolean, new_version integer, saved_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.campaigns%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_expected_version = 0 then
    insert into public.campaigns (user_id, id, name, data)
    values (v_uid, p_id, p_name, p_data)
    on conflict (user_id, id) do nothing
    returning * into v_row;
  else
    update public.campaigns c
    set name = p_name, data = p_data, version = c.version + 1, updated_at = now(), deleted_at = null
    where c.user_id = v_uid and c.id = p_id and c.version = p_expected_version
    returning * into v_row;
  end if;

  if v_row.id is not null then
    return query select true, v_row.version, v_row.updated_at;
  else
    select * into v_row from public.campaigns c where c.user_id = v_uid and c.id = p_id;
    return query select false, v_row.version, v_row.updated_at;
  end if;
end;
$$;

-- Apagar (recuperável pelo histórico). Mesma checagem de versão.
create function public.delete_campaign(p_id text, p_expected_version integer)
returns table (saved boolean, new_version integer, saved_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.campaigns%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.campaigns c
  set deleted_at = now(), version = c.version + 1, updated_at = now()
  where c.user_id = v_uid and c.id = p_id and c.version = p_expected_version
  returning * into v_row;

  if v_row.id is not null then
    return query select true, v_row.version, v_row.updated_at;
  else
    select * into v_row from public.campaigns c where c.user_id = v_uid and c.id = p_id;
    return query select false, v_row.version, v_row.updated_at;
  end if;
end;
$$;

revoke execute on function public.save_campaign(text, text, jsonb, integer) from public, anon;
revoke execute on function public.delete_campaign(text, integer) from public, anon;
grant execute on function public.save_campaign(text, text, jsonb, integer) to authenticated;
grant execute on function public.delete_campaign(text, integer) to authenticated;
