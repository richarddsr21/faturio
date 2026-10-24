# Faturio

SaaS multi-tenant de precificação, estoque, vendas e metas de faturamento.

## Regra crítica

Isolamento total de dados entre clientes. Toda tabela de tenant tem `user_id` e RLS.
Nenhuma Server Action confia em `user_id` vindo do client — sempre lido da sessão
autenticada no servidor. Ver `docs/superpowers/specs/2026-08-10-faturio-design.md`
para a spec completa.

## This is NOT the Next.js you know

Este projeto usa Next.js 16, que tem breaking changes em relação ao que modelos de
IA costumam ter em seus dados de treino. Antes de escrever código que usa APIs do
Next.js (roteamento, Server Actions, middleware, cache), consulte a documentação em
`node_modules/next/dist/docs/` deste projeto.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack

Next.js 16 (App Router) + TypeScript + React 19 + Tailwind CSS 4 + Supabase
(Postgres + Auth + RLS) + Mercado Pago (Checkout Pro) + Vitest.

## Git, commits e PRs

Fluxo completo em `docs/RELEASE.md`. Resumo do que seguir sempre:

### Branches

- Nunca commitar direto em `main` nem em `develop`.
- Branch a partir de `develop`, uma por issue:
  - `feat/<issue>-<slug>` — funcionalidade (ex.: `feat/98-redesign-clientes`)
  - `fix/<issue>-<slug>` — correção
  - `chore/<slug>` — infra, testes, dependências, docs
  - `hotfix/<issue>-<slug>` — correção urgente, sai de `main`
  - `release/vX.Y.Z` — release, sai de `develop`
- Só criar commit, push ou PR quando eu pedir.

### Commits

- Conventional Commits, em **pt-BR**: `tipo(escopo): descrição curta`
  - Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`.
  - Escopo = área do app (ex.: `dashboard`, `landing`, `relatorios`, `billing`, `admin`).
  - Descrição em minúscula, sem ponto final, dizendo o que muda para quem usa
    (ex.: `feat(billing): aviso de mensalidade vencendo e botão de pagar no Plano`).
  - Se houver issue, terminar o título com `(#123)`.
- Um commit por mudança lógica. Corpo (opcional) explica o *porquê*, não o *como*.
- Não usar `--amend` em commit já enviado nem `--no-verify`.

### Pull requests

- PR de feature/fix/chore → base `develop`. PR de release/hotfix → base `main`.
- Criar com `gh pr create`, título no mesmo formato do commit
  (o merge é **squash**, então o título do PR vira o commit em `develop`).
- Corpo: preencher **todas** as seções de `.github/pull_request_template.md`
  (Resumo, Tipo de mudança, O que foi feito, Como testar, Impacto, Checklist,
  Notas para o revisor). Apagar só as seções que não se aplicam (ex.: capturas).
- Incluir `Closes #<issue>` quando houver issue.
- Adicionar pelo menos uma label de categoria — as notas de release são
  agrupadas por ela (`.github/release.yml`):
  `feature`/`enhancement`, `bug`, `refactor`, `performance`, `documentation`,
  `chore`, `dependencies`, `breaking-change`, `skip-changelog`.
- Antes de abrir o PR: rodar lint, typecheck, testes e build e reportar o resultado.
- Textos de commit, PR e interface em pt-BR.

### Releases

- Seguir `docs/RELEASE.md`: `release/vX.Y.Z` a partir de `develop`, PR para `main`
  com `.github/PULL_REQUEST_TEMPLATE/release.md`, label `release`, merge commit (não squash).
- Lista do que vai sair: `scripts/release/notes.sh --version vX.Y.Z`.
- SemVer: PATCH só correções, MINOR funcionalidade nova, MAJOR breaking change.
