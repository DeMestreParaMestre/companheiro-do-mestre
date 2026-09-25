-- Apaga do Storage as imagens que nenhuma campanha (nem o histórico) referencia.
-- Caminho: <user_id>/<sha256>. Só remove arquivos com mais de 48 h, para não
-- cortar um envio que ainda não gravou a campanha.
-- Rodar no SQL Editor ou deixar o workflow semanal aplicar (idempotente).

create or replace function public.cleanup_orphan_images()
returns table (removed bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint;
begin
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
  delete from storage.objects o
  where o.bucket_id = 'images'
    and o.created_at < now() - interval '48 hours'
    and split_part(o.name, '/', 2) <> ''
    and not exists (
      select 1 from used u
      where u.user_id::text = split_part(o.name, '/', 1)
        and u.hash = split_part(o.name, '/', 2)
    );

  get diagnostics n = row_count;
  return query select n;
end;
$$;

revoke execute on function public.cleanup_orphan_images() from public, anon, authenticated;
