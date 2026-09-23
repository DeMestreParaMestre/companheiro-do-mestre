-- Imagens das campanhas no Storage (fora do JSON da campanha).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run.
-- Caminho de cada arquivo: <user_id>/<sha256 do conteúdo>. O nome pelo conteúdo
-- faz a mesma imagem subir uma vez só; cada usuário só acessa a própria pasta.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', false, 5242880, array['image/*'])
on conflict (id) do nothing;

create policy "images_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "images_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Usado ao excluir a conta (o Supabase não permite apagar arquivos direto pelo SQL).
create policy "images_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);
