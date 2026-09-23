-- Exclusão da própria conta (LGPD / exigência do Google para login OAuth).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run.
-- Apagar em auth.users leva junto, por cascade: campanhas, histórico,
-- sessões e identidades (Google/e-mail). Não há como desfazer.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
