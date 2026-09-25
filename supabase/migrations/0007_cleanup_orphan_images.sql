-- Lista imagens no Storage que nenhuma campanha (nem o histórico) referencia.
-- O apagar é pela API do Storage (o banco bloqueia DELETE direto nas tabelas
-- do Storage, para não deixar o arquivo órfão no disco).
-- Caminho: <user_id>/<sha256>. Só lista arquivos com mais de 48 h.
-- Rodar no SQL Editor ou deixar o workflow aplicar (idempotente).

drop function if exists public.cleanup_orphan_images();

create or replace function public.list_orphan_images()
returns table (name text)
language sql
security definer
set search_path = ''
as $$
  with refs as (
    select c.user_id, img #>> '{}' as img
    from public.campaigns c
    cross join lateral jsonb_path_query(c.data, '$.**.img') img
    union
    select h.user_id, img #>> '{}'
    from public.campaign_history h
    cross join lateral jsonb_path_query(h.data, '$.**.img') img
  ),
  used as (
    select user_id, substring(img from 7) as hash
    from refs
    where img like 'sbimg:%' and length(img) = 70
  )
  select o.name
  from storage.objects o
  where o.bucket_id = 'images'
    and o.created_at < now() - interval '48 hours'
    and split_part(o.name, '/', 2) <> ''
    and not exists (
      select 1 from used u
      where u.user_id::text = split_part(o.name, '/', 1)
        and u.hash = split_part(o.name, '/', 2)
    );
$$;

revoke execute on function public.list_orphan_images() from public, anon, authenticated;
