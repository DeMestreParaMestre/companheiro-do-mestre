-- Sessões do usuário (dispositivos logados) para a tela "Minha conta".
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run.
-- auth.sessions não é acessível pela API; estas funções expõem só as
-- sessões do próprio usuário logado.

create function public.list_my_sessions()
returns table (id uuid, created_at timestamptz, last_active_at timestamptz, user_agent text, ip text, is_current boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.created_at,
    greatest(s.refreshed_at::timestamptz, s.updated_at, s.created_at),
    s.user_agent,
    host(s.ip),
    s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  from auth.sessions s
  where s.user_id = auth.uid()
    and (s.not_after is null or s.not_after > now())
  order by 3 desc nulls last;
$$;

-- Encerra uma sessão do próprio usuário. O aparelho perde o acesso quando o
-- token atual expirar (até 1 h, o padrão do Supabase), pois não consegue renová-lo.
create function public.revoke_my_session(p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions s where s.id = p_session_id and s.user_id = auth.uid();
$$;

revoke execute on function public.list_my_sessions() from public, anon;
revoke execute on function public.revoke_my_session(uuid) from public, anon;
grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;
