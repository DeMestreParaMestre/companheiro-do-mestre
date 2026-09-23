-- E-mail de boas-vindas para quem cria a conta pelo Google (ou outro provedor OAuth).
-- Quem se cadastra por e-mail já recebe as boas-vindas no "Confirm signup".
-- Envio pela API do Brevo (https://www.brevo.com) via pg_net, de forma assíncrona:
-- se o envio falhar, o cadastro segue normalmente.
--
-- Antes de rodar, guarde no Vault (SQL Editor):
--   select vault.create_secret('xkeysib-xxx', 'brevo_api_key');
--   select vault.create_secret('seu-remetente@exemplo.com', 'welcome_email_from');
-- O remetente precisa estar verificado no Brevo (Senders, domains & IPs → Senders).
-- Sem os dois segredos, o gatilho simplesmente não envia nada.

create extension if not exists pg_net;

create or replace function public.send_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_key text;
  sender text;
  nome text;
  html text;
begin
  if coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email' or new.email is null then
    return new;
  end if;

  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into sender from vault.decrypted_secrets where name = 'welcome_email_from';
  if api_key is null or sender is null then
    return new;
  end if;

  nome := split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1);
  nome := replace(replace(replace(nome, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');

  html := replace($html$
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe0;padding:24px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#faf6ec;border:2px solid #5c3510;border-top:5px solid #8b0000;border-radius:4px;">
      <tr><td style="padding:28px 32px 8px;text-align:center;">
        <div style="font-size:28px;">🎲</div>
        <h1 style="margin:6px 0 4px;font-size:26px;color:#8b0000;letter-spacing:1px;">Bem-vindo, Mestre{{NOME}}!</h1>
        <p style="margin:0;font-style:italic;color:#5a3e28;font-size:16px;">Sua mesa de RPG, organizada em um só lugar.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;color:#1a1008;font-size:16px;line-height:1.6;">
        <p style="margin:0 0 16px;">Sua conta está pronta. Suas campanhas agora ficam salvas na nuvem e você pode usá-las em qualquer computador ou celular.</p>
        <p style="margin:0 0 24px;text-align:center;">
          <a href="https://demestreparamestre.github.io/companheiro-do-mestre/" style="display:inline-block;background:#8b0000;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:3px;">Abrir o Companheiro do Mestre</a>
        </p>
        <p style="margin:0 0 8px;font-weight:bold;color:#8b0000;">Primeiros passos</p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:6px;"><strong>Crie sua campanha</strong> ou carregue a de exemplo para ver tudo funcionando.</li>
          <li style="margin-bottom:6px;"><strong>Cadastre os personagens</strong> dos jogadores e importe monstros do SRD pelo nome.</li>
          <li style="margin-bottom:6px;"><strong>Na Iniciativa</strong>, role a ordem e controle turnos, vida e condições.</li>
          <li style="margin-bottom:6px;"><strong>Perdido?</strong> O botão "? Guia", no topo do site, mostra um tour por cada ferramenta.</li>
        </ul>
        <p style="margin:0;font-size:14px;color:#5a3e28;">Você recebeu este e-mail porque criou uma conta com o Google. Se não foi você, responda este e-mail.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #e5d8b8;text-align:center;font-size:13px;color:#5a3e28;">
        Companheiro do Mestre · De Mestre Para Mestre
      </td></tr>
    </table>
  </td></tr>
</table>
$html$, '{{NOME}}', case when nome = '' then '' else ' ' || nome end);

  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', api_key, 'Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'Companheiro do Mestre', 'email', sender),
      'to', jsonb_build_array(jsonb_build_object('email', new.email)),
      'subject', 'Bem-vindo ao Companheiro do Mestre',
      'htmlContent', html
    )
  );
  return new;
exception when others then
  -- O e-mail nunca pode impedir a criação da conta.
  raise warning 'send_welcome_email: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.send_welcome_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_welcome on auth.users;
create trigger on_auth_user_created_welcome
  after insert on auth.users
  for each row execute function public.send_welcome_email();
