# Companheiro do Mestre

App de mesa para mestres de D&D 5e (2014/2024). Vue 3 + Vite + TypeScript + Pinia, PWA, hospedado no GitHub Pages em `/companheiro-do-mestre/`. Conta é opcional: sem login tudo fica no navegador; com login, o Supabase sincroniza campanhas.

Este arquivo é o mapa. Detalhes ficam nas regras em `.cursor/rules/` — leia só a que o trabalho pede.

## O que não fazer

- Não mudar layout, copy ou comportamento visível sem o usuário pedir.
- Não commitar nem abrir PR sem pedido explícito.
- Não publicar no Pages a cada merge. Merge na `main` só integra; o ar muda no workflow **Release** (depois **Deploy**).
- Não colocar lógica de regras (dano, iniciativa, sync, imagens) dentro de `.vue`. Extraia para `src/utils/`.
- Não apontar para celular: o alvo é desktop/notebook.

## Onde mexer

| Área | Pasta / arquivo |
|---|---|
| Abas da mesa | `src/components/sections/` |
| Combate (já fatiado) | `src/components/initiative/` + `InitiativeSection.vue` |
| UI compartilhada | `src/components/ui/` |
| Estado local da campanha | `src/stores/campaign.ts` |
| Nuvem | `src/stores/sync.ts`, `src/utils/syncPlan.ts` |
| Auth / conta | `src/stores/auth.ts` |
| Tipos | `src/types.ts` |
| Regras de jogo e helpers | `src/utils/` |
| Capa | `src/components/LandingPage.vue` |
| Tela do jogador (`#player`) | `src/player/PlayerWindow.vue` |
| SQL / Auth / Storage | `supabase/migrations/` |
| CI e publicação | `.github/workflows/` |

Entrada: `src/main.ts` (app normal ou `#player`). Shell: `src/App.vue`.

## Idioma e tom

UI, alertas e assunto do commit em português. Chaves persistidas (condições, tipos) não traduzir — ver `src/constants.ts`.

Commit: `tipo(escopo): assunto` — ver `.cursor/rules/commits.mdc`. Ex.: `feat(images): aceitar só JPEG, PNG e WebP`.

## Comandos

```bash
npm run dev      # http://localhost:5173/companheiro-do-mestre/
npm test
npx vue-tsc --noEmit -p tsconfig.app.json
npm run build
```

## Secundários

- Arquitetura e fluxo de dados → `.cursor/rules/architecture.mdc`
- Vue / componentes → `.cursor/rules/vue-components.mdc`
- Testes → `.cursor/rules/testing.mdc`
- Supabase → `.cursor/rules/supabase.mdc`
- Versão e deploy → `.cursor/rules/release.mdc`
- Mensagens de commit → `.cursor/rules/commits.mdc`
