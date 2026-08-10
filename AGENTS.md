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
