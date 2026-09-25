# Companheiro do Mestre

Ferramentas para mestres de D&D 5e (2014 e 2024): combate, fichas, personagens, itens, magias, músicas, referências e diário. Roda no navegador (PWA), no desktop ou notebook. A conta é opcional — sem login tudo fica neste computador; com login, a campanha sincroniza na nuvem.

Site: [demestreparamestre.github.io/companheiro-do-mestre](https://demestreparamestre.github.io/companheiro-do-mestre/)

Feito com **Vue 3 + Vite + TypeScript + Pinia**. Versão atual: ver `package.json` (semver).

## O que tem

- **Capa** de entrada e **tour** pelas abas na primeira vez.
- **Iniciativa:** turnos, rodadas, HP (incluindo temporário), condições em português, salvamentos contra morte, concentração, ações lendárias, party, encontros, log e atalho `N`.
- **Fichas, itens e magias** com import do [SRD via Open5e](https://open5e.com/).
- **Personagens** ligados à party e ao combate (HP sincronizado).
- **Músicas**, **referências** e **diário** (@menções, envio do log de combate).
- **Tela do jogador** em janela à parte (`#player`), só leitura, via BroadcastChannel.
- **Conta:** e-mail ou Google, captcha (Turnstile), exclusão de conta, feedback pelo rodapé.
- **Backup** em arquivo (exportar/importar JSON) e, com conta, sincronização entre computadores.

Imagens novas: só **JPEG, PNG ou WebP** (máx. 5 MB no Storage). SVG e GIF não sobem para a nuvem.

## Desenvolvimento

Node.js 22 (LTS).

```bash
npm install
npm run dev      # http://localhost:5173/companheiro-do-mestre/
npm test
npm run build    # vue-tsc + Vite
```

`localhost` é outra origem que a produção: os dados de teste não se misturam com os do site publicado.

## Publicar

Merge na `main` **não** atualiza o site. O CI (`ci.yml`) só checa tipos, testes e build.

1. Abra um PR. Depois do merge, a branch some sozinha.
2. Actions → **Release** → rode na `main` com `patch`, `minor` ou `major` (a tag `v2.0.0` já existe; não use `current`).
3. Isso sobe o número em `package.json`, cria o GitHub Release e dispara o **Deploy to GitHub Pages**.

Hotfix sem nova tag: Actions → **Deploy to GitHub Pages** → `main`.

O site fica em `/companheiro-do-mestre/` (`base` no `vite.config.ts`). Num domínio na raiz, troque para `'/'`.

## Conta e nuvem (Supabase)

Sem as variáveis abaixo, o login some; exportar/importar JSON continua valendo.

1. Crie o projeto no [Supabase](https://supabase.com/) e rode, no **SQL Editor**, os arquivos de `supabase/migrations/` **em ordem** (`0001` … `0008`).
2. Em Authentication → URL Configuration, coloque a URL do site e `http://localhost:5173/companheiro-do-mestre/**` nas Redirect URLs.
3. `.env.local` (chave **anon/publishable**, nunca `service_role`):

   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

   Opcional no build: `VITE_SENTRY_DSN`, `VITE_TURNSTILE_SITE_KEY`.

4. No GitHub (Settings → Secrets): os mesmos `VITE_*` do deploy, mais o que os crons pedem (`SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, senha do backup — ver `supabase/BACKUP.md`).

E-mails (boas-vindas, feedback) passam pelo Brevo, com segredos no Vault do Supabase.

Backup diário do banco: workflow `backup.yml`. Limpeza de imagens órfãs: `cleanup-images.yml`.

## Dados no navegador

Campanhas em **IndexedDB** (fallback `localStorage`), chave `nc_data`. Com conta, o JSON vai ao Postgres e as imagens ao bucket `images` (`<user_id>/<hash>`), só a pasta do dono.

## Estrutura

```
src/
├── main.ts / App.vue / LandingPage.vue
├── types.ts, constants.ts, monitoring.ts
├── stores/          # campaign, auth, sync, settings, musicPlayer
├── utils/           # regras de jogo, sync, imagens, Open5e
├── components/sections/     # uma aba cada
├── components/initiative/   # pedaços do combate
├── components/ui/
└── player/          # janela #player
supabase/migrations/
.github/workflows/   # ci, release, deploy, backup, limpeza
AGENTS.md            # mapa para a IA; detalhes em .cursor/rules/
```

O app antigo em arquivo único está em `legacy/`, só como referência.

## Licenças

Créditos do SRD (CC-BY-4.0) e do Open5e ficam no rodapé do app, em **Créditos e licenças**. Termos e privacidade: `public/termos.html` e `public/privacidade.html`.
