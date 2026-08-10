# Faturio

Plataforma de precificação, estoque, vendas e metas de faturamento.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local  # preencher com suas credenciais
npx supabase start          # sobe o Postgres local
npm run dev
```

## Testes

```bash
npm run test              # unitários
npx supabase start && npm run test:integration  # integração (requer Supabase local)
```

Spec completa em `docs/superpowers/specs/2026-08-10-faturio-design.md`.
