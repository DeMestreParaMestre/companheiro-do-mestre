-- Feedback enviado pelo app (sugestões e problemas).
-- Rodar uma vez no Supabase: SQL Editor → New query → colar → Run. Pode rodar de novo sem problema.
-- Qualquer pessoa (logada ou não) pode enviar; ninguém lê pelo app: veja em Table Editor → feedback.
-- Cada envio gera um e-mail para você pelo Brevo, usando os segredos do Vault da 0005
-- (brevo_api_key e welcome_email_from). Para receber em outro endereço:
--   select vault.create_secret('seu-email@exemplo.com', 'feedback_to');

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid default auth.uid() references auth.users (id) on delete set null,
  kind        text not null check (kind in ('problema', 'sugestao', 'outro')),
  message     text not null check (char_length(message) between 5 and 4000),
  contact     text check (char_length(contact) <= 200),
  page        text check (char_length(page) <= 100),
  user_agent  text check (char_length(user_agent) <= 400),
  app_version text check (char_length(app_version) <= 64)
);

alter table public.feedback enable row level security;

drop policy if exists "feedback: qualquer um envia" on public.feedback;
create policy "feedback: qualquer um envia" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

grant insert on public.feedback to anon, authenticated;

-- Contra abuso: até 5 envios por hora por conta e 30 por hora somando todos os visitantes sem login.
create or replace function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    if (select count(*) from public.feedback
        where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'feedback rate limit';
    end if;
  elsif (select count(*) from public.feedback
         where user_id is null and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'feedback rate limit';
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_rate_limit();

create or replace function public.feedback_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_key text;
  sender text;
  dest text;
  label text;
  esc_message text;
  esc_contact text;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'welcome_email_from';
  select decrypted_secret into dest from vault.decrypted_secrets where name = 'feedback_to';
  dest := coalesce(dest, sender);
  if api_key is null or sender is null then
    return new;
  end if;

  label := case new.kind when 'problema' then 'Problema' when 'sugestao' then 'Sugestão' else 'Outro' end;
  esc_message := replace(replace(replace(new.message, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
  esc_contact := replace(replace(replace(coalesce(new.contact, '—'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');

  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', api_key, 'Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'Companheiro do Mestre', 'email', sender),
      -- "Responder" no e-mail vai direto para quem enviou (se deixou um e-mail válido).
      'replyTo', jsonb_build_object('email', case when new.contact ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then new.contact else sender end),
      'to', jsonb_build_array(jsonb_build_object('email', dest)),
      'subject', '[Feedback] ' || label || ' #' || new.id,
      'htmlContent',
        '<div style="font-family:Georgia,serif;font-size:15px;line-height:1.6">'
        || '<p><strong>' || label || '</strong> · #' || new.id || '</p>'
        || '<p style="white-space:pre-wrap;border-left:3px solid #8b0000;padding-left:12px">' || esc_message || '</p>'
        || '<p style="font-size:13px;color:#5a3e28">Contato: ' || esc_contact
        || '<br>Conta: ' || coalesce(new.user_id::text, 'sem login')
        || '<br>Aba: ' || coalesce(new.page, '—')
        || '<br>Versão: ' || coalesce(new.app_version, '—')
        || '<br>Navegador: ' || replace(replace(coalesce(new.user_agent, '—'), '<', '&lt;'), '>', '&gt;')
        || '</p></div>'
    )
  );
  return new;
exception when others then
  raise warning 'feedback_notify: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists feedback_notify on public.feedback;
create trigger feedback_notify
  after insert on public.feedback
  for each row execute function public.feedback_notify();

revoke execute on function public.feedback_rate_limit() from public, anon, authenticated;
revoke execute on function public.feedback_notify() from public, anon, authenticated;
