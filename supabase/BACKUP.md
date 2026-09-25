# Backup do banco

O workflow `.github/workflows/backup.yml` roda todo dia às 03:00 (Brasília) e também sob demanda
(Actions → **Backup do banco** → **Run workflow**). Cada execução guarda, por 90 dias, um arquivo
`backup.sql.gz.gpg` criptografado com a senha do secret `BACKUP_PASSPHRASE`.

O que entra:

- contas: dados de `auth.users` e `auth.identities` (e-mail, senha criptografada, vínculo com o Google);
- esquema `public` completo: tabelas, funções, gatilhos, políticas de RLS e dados (campanhas e histórico).

O que não entra: o conteúdo das imagens (bucket `images` do Storage), sessões de login e configurações
do painel (provedores de login, templates de e-mail, SMTP, segredos do Vault).

Imagens trocadas ou removidas ficam no Storage até a limpeza semanal
(`.github/workflows/cleanup-images.yml`): apaga arquivos com mais de 48 h que
nenhuma campanha nem o histórico referencia. Roda todo domingo às 04:00 (Brasília)
e também sob demanda (Actions → **Limpeza de imagens órfãs** → **Run workflow**).

Secrets necessários no GitHub:

- `SUPABASE_DB_URL`: Supabase → Connect → Direct → **Session pooler**, com a senha do banco no lugar
  de `[YOUR-PASSWORD]`. Se a senha tiver caracteres como `@`, `#` ou `/`, eles precisam ser codificados
  (`%40`, `%23`, `%2F`).
- `BACKUP_PASSPHRASE`: senha dos arquivos. Guarde uma cópia fora do GitHub: sem ela não há como abrir os backups.

## Restaurar

1. Na execução desejada do workflow, baixe o artefato `backup-AAAA-MM-DD` e extraia o `.zip`.
2. Descriptografe (pede a senha):

   ```sh
   gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
   ```

3. Restaure num projeto Supabase **novo e vazio** (restaurar por cima do projeto atual duplica dados):

   ```sh
   gunzip -c backup.sql.gz | psql "URL_DO_SESSION_POOLER_DO_PROJETO_NOVO"
   ```

   Avisos como `schema "public" already exists` são esperados e podem ser ignorados.

4. Só depois da restauração, rode no projeto novo a migração `0004_images_storage.sql` (bucket e
   políticas do Storage) e, se quiser o e-mail de boas-vindas, `0005_welcome_email.sql` com os segredos
   do Vault. Rodar a `0005` antes faria o gatilho enviar boas-vindas para todas as contas restauradas.
5. Refaça as configurações do painel (login com Google, URLs de redirecionamento, templates, SMTP)
   e atualize `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nos secrets do GitHub se o projeto mudou.

Para recuperar só uma campanha, descompacte o arquivo e procure pelo nome dela no bloco
`COPY public.campaigns`, ou restaure num projeto temporário e copie a linha de lá.
