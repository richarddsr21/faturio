# Faturio — Plano 1: Fundação (scaffolding, banco, auth, motor financeiro, pagamento)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a fundação segura do Faturio: projeto Next.js configurado, schema do banco com RLS em todas as tabelas de tenant, autenticação Supabase com middleware de proteção, o teste crítico de isolamento multi-tenant, o motor de fórmulas financeiras, e o fluxo completo de pagamento único via Mercado Pago (checkout → webhook idempotente → criação de conta).

**Architecture:** Next.js 16 App Router com Server Actions para mutações; Supabase Postgres com RLS como camada de isolamento primária e verificação de `user_id` no servidor como camada secundária; Mercado Pago Checkout Pro com confirmação via webhook assinado, nunca via página de retorno.

**Tech Stack:** Next.js 16, TypeScript, React 19, Tailwind CSS 4, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Zod, react-hook-form, Vitest.

## Global Constraints

- Preço do produto: **R$ 129,90**, pagamento único (não recorrente).
- Toda tabela que armazena dado de cliente tem `user_id uuid references auth.users(id)` e RLS habilitada com política `USING (user_id = auth.uid())` / `WITH CHECK (user_id = auth.uid())`.
- Nenhuma Server Action ou Route Handler aceita `user_id` vindo do client — sempre lido de `supabase.auth.getUser()` no servidor.
- `service_role` key só é usada em `lib/supabase/admin.ts`, exclusivamente em código server-only (webhook handler); nunca importada por código client.
- Idempotência do webhook do Mercado Pago via `UNIQUE(mercadopago_payment_id)` em `subscriptions` — reprocessar o mesmo `payment_id` nunca duplica conta/acesso.
- Estoque nunca negativo: `CHECK (stock_quantity >= 0)`.
- Fórmula de preço `Preço = C / (1 - T - M)` só calcula se `T + M < 1`; caso contrário lança erro explícito.
- Conta do cliente só é criada **depois** da confirmação do pagamento (via webhook), nunca antes.
- Gerenciador de pacotes: npm (consistente com os demais projetos do cliente).

---

## Task 1: Scaffold do projeto Next.js

**Files:**
- Create: projeto Next.js completo no diretório de trabalho atual (via `create-next-app`)

**Interfaces:**
- Produces: projeto Next.js 16 + TypeScript + Tailwind 4 + ESLint pronto para receber código

- [ ] **Step 1: Rodar o scaffold em pasta temporária e mesclar no diretório do projeto**

O diretório de trabalho atual já existe (com `.git` e `docs/`), então o scaffold é feito em
uma pasta temporária **irmã do diretório atual** (nunca em um caminho absoluto fixo — o
diretório de trabalho pode ser um worktree isolado, não o checkout principal) e mesclado,
evitando o prompt interativo de "diretório não vazio". Rode os comandos abaixo exatamente
como estão, a partir do diretório de trabalho atual, sem trocar de diretório antes:

```bash
PROJECT_DIR="$(pwd)"
SCAFFOLD_TMP="${PROJECT_DIR}_scaffold_tmp"
npx create-next-app@latest "$SCAFFOLD_TMP" \
  --typescript --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --turbopack --use-npm
rsync -a --exclude=.git "$SCAFFOLD_TMP"/ "$PROJECT_DIR"/
rm -rf "$SCAFFOLD_TMP"
```

- [ ] **Step 2: Verificar que o servidor de desenvolvimento sobe sem erros**

Run: `npm run dev -- --port 3100 &` depois `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100` e então `kill %1`
Expected: código HTTP `200`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold do projeto Next.js 16"
```

---

## Task 2: Documentação do projeto e configuração de ambiente

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `README.md`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: nenhuma interface de código — apenas documentação e template de variáveis de ambiente consumido por todas as tasks seguintes.

- [ ] **Step 1: Criar `AGENTS.md`**

```markdown
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

## Stack

Next.js 16 (App Router) + TypeScript + React 19 + Tailwind CSS 4 + Supabase
(Postgres + Auth + RLS) + Mercado Pago (Checkout Pro) + Vitest.
```

- [ ] **Step 2: Criar `CLAUDE.md` apontando para `AGENTS.md`**

```markdown
@AGENTS.md
```

- [ ] **Step 3: Criar `README.md`**

```markdown
# Faturio

Plataforma de precificação, estoque, vendas e metas de faturamento.

## Desenvolvimento

\`\`\`bash
npm install
cp .env.example .env.local  # preencher com suas credenciais
npx supabase start          # sobe o Postgres local
npm run dev
\`\`\`

## Testes

\`\`\`bash
npm run test              # unitários
npx supabase start && npm run test:integration  # integração (requer Supabase local)
\`\`\`

Spec completa em `docs/superpowers/specs/2026-08-10-faturio-design.md`.
```

- [ ] **Step 4: Criar `.env.example`**

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
```

- [ ] **Step 5: Garantir que `.env.local` está no `.gitignore`**

Verifique se `.gitignore` (gerado pelo `create-next-app`) já contém `.env*.local` — normalmente já contém. Se não contiver, adicione a linha.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md CLAUDE.md README.md .env.example .gitignore
git commit -m "docs: documentação inicial do projeto e template de ambiente"
```

---

## Task 3: Dependências principais e configuração do Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/unit/sanity.test.ts`

**Interfaces:**
- Produces: comando `npm run test` funcional, usado por todas as tasks de teste seguintes.

- [ ] **Step 1: Instalar dependências**

```bash
npm install @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers
npm install -D vitest supabase
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 3: Adicionar scripts em `package.json`**

```json
{
  "scripts": {
    "test": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Escrever teste de sanidade**

```typescript
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("roda testes TypeScript corretamente", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm run test`
Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/unit/sanity.test.ts
git commit -m "chore: configura Vitest e dependências principais"
```

---

## Task 4: Projeto Supabase remoto (concluída pelo controller — ver nota)

> **Nota:** Docker não está disponível neste ambiente, então esta task foi adaptada de
> "Supabase local" para "Supabase remoto" e já foi executada pelo controller antes da
> Task 5, com a colaboração do usuário (login interativo via `supabase login`, criação do
> projeto em supabase.com). Os passos abaixo documentam o que foi feito, para contexto das
> tasks seguintes — não precisam ser reexecutados.

**Files:**
- Create: `supabase/config.toml` (gerado pelo CLI)
- Create: `.env.local` (gitignored, não commitado)

**Interfaces:**
- Produces: projeto Supabase remoto linkado (`mdapowazaksgxxinvwkk`), usado pelas migrations
  (Tasks 5-6) e testes de integração (Tasks 9, 15) via `supabase db push --linked` /
  `supabase db query --linked`.

O que foi feito:

```bash
npx supabase init
npx supabase login          # interativo, feito pelo usuário fora desta sessão de agente
npx supabase link --project-ref mdapowazaksgxxinvwkk
```

`.env.local` foi criado na raiz do projeto com `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (usados pela aplicação) e
também `SUPABASE_URL`/`SUPABASE_ANON_KEY` sem prefixo (usados pelos testes de integração,
que rodam fora do runtime do Next.js). Antes de rodar `npm run test:integration` em
qualquer task futura, carregue essas variáveis no shell:

```bash
set -a && source .env.local && set +a
```

- [ ] **Step 1: Commit dos arquivos de config do Supabase**

```bash
git add supabase/config.toml
git commit -m "chore: linka projeto Supabase remoto (faturio-dev)"
```

(`.env.local` não é commitado — já está coberto pelo `.gitignore` da Task 2.)

---

## Task 5: Migration — schema principal

**Files:**
- Create: `supabase/migrations/20260810000000_initial_schema.sql`

**Interfaces:**
- Produces: tabelas `profiles`, `subscriptions`, `pending_checkouts`, `products`, `sales`,
  `sale_items`, `inventory_movements`, `goals`, `marketing_expenses`, `settings` — consumidas
  por todas as tasks seguintes.

- [ ] **Step 1: Escrever a migration**

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'expired', 'cancelled', 'blocked')),
  mercadopago_payment_id text unique,
  amount numeric(10,2) not null default 129.90,
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.pending_checkouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  mercadopago_payment_id text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  supplier text,
  cost numeric(10,2) not null default 0 check (cost >= 0),
  entry_shipping numeric(10,2) not null default 0 check (entry_shipping >= 0),
  current_price numeric(10,2) check (current_price >= 0),
  desired_margin numeric(5,4) check (desired_margin >= 0 and desired_margin < 1),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_date timestamptz not null default now(),
  payment_method text not null,
  discount numeric(10,2) not null default 0 check (discount >= 0),
  gross_revenue numeric(10,2) not null check (gross_revenue >= 0),
  fees numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  packaging_cost numeric(10,2) not null default 0,
  gift_cost numeric(10,2) not null default 0,
  traffic_cost numeric(10,2) not null default 0,
  net_profit numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  subtotal numeric(10,2) not null,
  profit numeric(10,2) not null
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  type text not null check (type in ('initial', 'entry', 'sale', 'adjustment', 'return')),
  quantity integer not null,
  unit_cost numeric(10,2),
  reason text,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  revenue_goal numeric(10,2) not null check (revenue_goal >= 0),
  desired_margin numeric(5,4) check (desired_margin >= 0 and desired_margin < 1),
  created_at timestamptz not null default now(),
  unique (user_id, month, year)
);

create table public.marketing_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  platform text not null check (platform in ('meta_ads', 'google_ads', 'tiktok_ads', 'other')),
  campaign text,
  amount numeric(10,2) not null check (amount >= 0),
  sales integer not null default 0 check (sales >= 0),
  revenue numeric(10,2) not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  packaging_cost numeric(10,2) not null default 0,
  gift_cost numeric(10,2) not null default 0,
  shipping_cost numeric(10,2) not null default 0,
  admin_fee numeric(5,4) not null default 0 check (admin_fee >= 0 and admin_fee < 1),
  card_fee numeric(5,4) not null default 0 check (card_fee >= 0 and card_fee < 1),
  traffic_cost numeric(10,2) not null default 0,
  desired_margin numeric(5,4) not null default 0 check (desired_margin >= 0 and desired_margin < 1),
  constraint fees_and_margin_below_100_percent check (admin_fee + card_fee + desired_margin < 1)
);
```

Salve como `supabase/migrations/20260810000000_initial_schema.sql`.

- [ ] **Step 2: Aplicar a migration no projeto Supabase remoto linkado**

```bash
npx supabase db push --linked
```

Expected: saída listando a migration `20260810000000_initial_schema.sql` como aplicada, sem erros.

- [ ] **Step 3: Verificar que as tabelas existem**

Run: `npx supabase db query --linked "select table_name from information_schema.tables where table_schema = 'public' order by table_name;"`
Expected: lista contendo as 10 tabelas criadas acima.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260810000000_initial_schema.sql
git commit -m "feat(db): schema inicial multi-tenant"
```

---

## Task 6: Migration — políticas RLS

**Files:**
- Create: `supabase/migrations/20260810000001_rls_policies.sql`

**Interfaces:**
- Consumes: tabelas da Task 5
- Produces: RLS habilitada e políticas de isolamento em todas as tabelas de tenant, verificadas pelo teste da Task 9.

- [ ] **Step 1: Escrever a migration**

```sql
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.pending_checkouts enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.goals enable row level security;
alter table public.marketing_expenses enable row level security;
alter table public.settings enable row level security;

-- pending_checkouts não tem políticas: só o service_role (que ignora RLS) acessa essa tabela,
-- usada exclusivamente pelo fluxo servidor-a-servidor de checkout/webhook.

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "subscriptions_select_own" on public.subscriptions for select using (user_id = auth.uid());

create policy "products_select_own" on public.products for select using (user_id = auth.uid());
create policy "products_insert_own" on public.products for insert with check (user_id = auth.uid());
create policy "products_update_own" on public.products for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "products_delete_own" on public.products for delete using (user_id = auth.uid());

create policy "sales_select_own" on public.sales for select using (user_id = auth.uid());
create policy "sales_insert_own" on public.sales for insert with check (user_id = auth.uid());
create policy "sales_update_own" on public.sales for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sales_delete_own" on public.sales for delete using (user_id = auth.uid());

create policy "sale_items_select_own" on public.sale_items for select using (user_id = auth.uid());
create policy "sale_items_insert_own" on public.sale_items for insert with check (user_id = auth.uid());
create policy "sale_items_update_own" on public.sale_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sale_items_delete_own" on public.sale_items for delete using (user_id = auth.uid());

create policy "inventory_movements_select_own" on public.inventory_movements for select using (user_id = auth.uid());
create policy "inventory_movements_insert_own" on public.inventory_movements for insert with check (user_id = auth.uid());

create policy "goals_select_own" on public.goals for select using (user_id = auth.uid());
create policy "goals_insert_own" on public.goals for insert with check (user_id = auth.uid());
create policy "goals_update_own" on public.goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_own" on public.goals for delete using (user_id = auth.uid());

create policy "marketing_expenses_select_own" on public.marketing_expenses for select using (user_id = auth.uid());
create policy "marketing_expenses_insert_own" on public.marketing_expenses for insert with check (user_id = auth.uid());
create policy "marketing_expenses_update_own" on public.marketing_expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "marketing_expenses_delete_own" on public.marketing_expenses for delete using (user_id = auth.uid());

create policy "settings_select_own" on public.settings for select using (user_id = auth.uid());
create policy "settings_insert_own" on public.settings for insert with check (user_id = auth.uid());
create policy "settings_update_own" on public.settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Salve como `supabase/migrations/20260810000001_rls_policies.sql`.

- [ ] **Step 2: Aplicar e verificar**

```bash
npx supabase db push --linked
npx supabase db query --linked "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;"
```

Expected: todas as tabelas listadas com `rowsecurity = t`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260810000001_rls_policies.sql
git commit -m "feat(db): políticas RLS de isolamento multi-tenant"
```

---

## Task 7: Clientes Supabase (browser, server, admin)

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

**Interfaces:**
- Produces:
  - `createClient()` em `lib/supabase/client.ts` — cliente para Client Components.
  - `async createClient()` em `lib/supabase/server.ts` — cliente para Server Components/Actions.
  - `createAdminClient()` em `lib/supabase/admin.ts` — cliente com `service_role`, server-only.
- Consumido por: Task 8 (middleware), Task 9 (teste), Task 13 (checkout action), Task 14
  (webhook), Task 17 (login).

- [ ] **Step 1: Criar `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Criar `lib/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component — o middleware cuida de renovar a sessão
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Criar `lib/supabase/admin.ts`**

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Usa a service_role key, que ignora RLS. Só pode ser importado por código
 * server-only (Route Handlers, webhook). Nunca importar em Client Components.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase
git commit -m "feat(auth): clientes Supabase para browser, server e admin"
```

---

## Task 8: Middleware de proteção do `/dashboard`

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: nenhuma função local — usa `createServerClient` do `@supabase/ssr` diretamente
  (o middleware roda fora do runtime Node completo, não pode reusar `lib/supabase/server.ts`
  que depende de `next/headers`).
- Produces: redirecionamento automático para `/login` (sem sessão) ou `/checkout` (sessão sem
  assinatura ativa) em qualquer rota `/dashboard/**`.

- [ ] **Step 1: Criar `middleware.ts`**

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription) {
    return NextResponse.redirect(new URL("/checkout", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): middleware protege /dashboard exigindo sessão e assinatura ativa"
```

---

## Task 9: Teste crítico de isolamento multi-tenant

**Files:**
- Test: `tests/integration/rls-isolation.test.ts`

**Interfaces:**
- Consumes: tabelas + RLS das Tasks 5-6, diretamente via `@supabase/supabase-js` (não usa
  `lib/supabase/*` porque roda fora do Next.js).
- Produces: garantia automatizada e repetível de que a regra mais importante do produto
  (seção 2 da spec) é respeitada no banco.

- [ ] **Step 1: Escrever o teste (falha antes das migrations existirem, mas já passamos das
  Tasks 5-6, então valide contra o projeto Supabase remoto linkado)**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTestUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!;
}

async function signInAs(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe("isolamento multi-tenant (RLS)", () => {
  const userAEmail = `user-a-${Date.now()}@faturio-test.com`;
  const userBEmail = `user-b-${Date.now()}@faturio-test.com`;
  const password = "senha-teste-12345";

  let userAId: string;
  let userBId: string;
  let productAId: string;

  beforeAll(async () => {
    const userA = await createTestUser(userAEmail, password);
    const userB = await createTestUser(userBEmail, password);
    userAId = userA.id;
    userBId = userB.id;

    const { data: productA, error } = await admin
      .from("products")
      .insert({ user_id: userAId, name: "Produto A1", cost: 10, stock_quantity: 5 })
      .select()
      .single();
    if (error) throw error;
    productAId = productA.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
  });

  it("User B não consegue LER o produto do User A", async () => {
    const clientB = await signInAs(userBEmail, password);
    const { data, error } = await clientB.from("products").select().eq("id", productAId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("User B não consegue ATUALIZAR o produto do User A", async () => {
    const clientB = await signInAs(userBEmail, password);
    const { data } = await clientB
      .from("products")
      .update({ name: "Produto Roubado" })
      .eq("id", productAId)
      .select();
    expect(data).toEqual([]);

    const { data: unchanged } = await admin
      .from("products")
      .select()
      .eq("id", productAId)
      .single();
    expect(unchanged!.name).toBe("Produto A1");
  });

  it("User B não consegue EXCLUIR o produto do User A", async () => {
    const clientB = await signInAs(userBEmail, password);
    await clientB.from("products").delete().eq("id", productAId);

    const { data: stillExists } = await admin
      .from("products")
      .select()
      .eq("id", productAId)
      .single();
    expect(stillExists).not.toBeNull();
  });

  it("User A consegue ler o próprio produto normalmente", async () => {
    const clientA = await signInAs(userAEmail, password);
    const { data } = await clientA.from("products").select().eq("id", productAId).single();
    expect(data!.name).toBe("Produto A1");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que passa (com as variáveis de `.env.local` carregadas —
  `set -a && source .env.local && set +a` antes do comando)**

Run: `npm run test:integration`
Expected: `4 passed`

- [ ] **Step 3: Commit**

```bash
git add tests/integration/rls-isolation.test.ts
git commit -m "test: teste crítico de isolamento multi-tenant entre clientes"
```

---

## Task 10: Motor financeiro — fórmula de precificação

**Files:**
- Create: `lib/finance/pricing.ts`
- Test: `tests/unit/finance/pricing.test.ts`

**Interfaces:**
- Produces: `calculateRecommendedPrice(input): number`, `PricingError` — usados pelo cadastro
  de produtos no Plano 2.

- [ ] **Step 1: Escrever os testes que falham**

```typescript
import { describe, it, expect } from "vitest";
import { calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";

describe("calculateRecommendedPrice", () => {
  it("calcula o preço recomendado a partir de custo, taxas e margem", () => {
    const price = calculateRecommendedPrice({
      fixedCostsPerUnit: 30,
      feesPercentage: 0.1,
      desiredMargin: 0.2,
    });
    expect(price).toBeCloseTo(30 / 0.7, 2);
  });

  it("lança PricingError quando taxas + margem >= 100%", () => {
    expect(() =>
      calculateRecommendedPrice({
        fixedCostsPerUnit: 30,
        feesPercentage: 0.5,
        desiredMargin: 0.6,
      })
    ).toThrow(PricingError);
  });

  it("lança PricingError quando taxas + margem == 100% exatamente", () => {
    expect(() =>
      calculateRecommendedPrice({
        fixedCostsPerUnit: 30,
        feesPercentage: 0.5,
        desiredMargin: 0.5,
      })
    ).toThrow(PricingError);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/unit/finance/pricing.test.ts`
Expected: FAIL com "Cannot find module '@/lib/finance/pricing'"

- [ ] **Step 3: Implementar**

```typescript
export class PricingError extends Error {}

export interface RecommendedPriceInput {
  fixedCostsPerUnit: number;
  feesPercentage: number;
  desiredMargin: number;
}

export function calculateRecommendedPrice(input: RecommendedPriceInput): number {
  const { fixedCostsPerUnit, feesPercentage, desiredMargin } = input;
  const denominator = 1 - feesPercentage - desiredMargin;

  if (denominator <= 0) {
    throw new PricingError(
      "A soma das taxas percentuais com a margem desejada não pode atingir 100%."
    );
  }

  return fixedCostsPerUnit / denominator;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/unit/finance/pricing.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/finance/pricing.ts tests/unit/finance/pricing.test.ts
git commit -m "feat(finance): fórmula de precificação recomendada"
```

---

## Task 11: Motor financeiro — progresso de meta e potencial de estoque

**Files:**
- Create: `lib/finance/goals.ts`
- Create: `lib/finance/stock-potential.ts`
- Test: `tests/unit/finance/goals.test.ts`
- Test: `tests/unit/finance/stock-potential.test.ts`

**Interfaces:**
- Produces: `calculateGoalProgress(input): GoalProgress`,
  `calculateStockPotential(products): number`, `meetsGoalWithStock(potential, goal): boolean`
  — usados pelo dashboard no Plano 3.

- [ ] **Step 1: Escrever o teste de `calculateGoalProgress` que falha**

```typescript
import { describe, it, expect } from "vitest";
import { calculateGoalProgress } from "@/lib/finance/goals";

describe("calculateGoalProgress", () => {
  it("calcula quanto falta e quantas vendas estimadas faltam", () => {
    const result = calculateGoalProgress({
      goal: 50000,
      currentRevenue: 32450,
      averageTicket: 125,
    });
    expect(result.remaining).toBeCloseTo(17550, 2);
    expect(result.estimatedSalesNeeded).toBe(141);
    expect(result.progressPercentage).toBeCloseTo(0.649, 3);
  });

  it("não retorna valor negativo quando a meta já foi batida", () => {
    const result = calculateGoalProgress({
      goal: 10000,
      currentRevenue: 15000,
      averageTicket: 100,
    });
    expect(result.remaining).toBe(0);
    expect(result.estimatedSalesNeeded).toBe(0);
    expect(result.progressPercentage).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/unit/finance/goals.test.ts`
Expected: FAIL com "Cannot find module '@/lib/finance/goals'"

- [ ] **Step 3: Implementar `lib/finance/goals.ts`**

```typescript
export interface GoalProgressInput {
  goal: number;
  currentRevenue: number;
  averageTicket: number;
}

export interface GoalProgress {
  remaining: number;
  estimatedSalesNeeded: number;
  progressPercentage: number;
}

export function calculateGoalProgress(input: GoalProgressInput): GoalProgress {
  const { goal, currentRevenue, averageTicket } = input;
  const remaining = Math.max(goal - currentRevenue, 0);
  const estimatedSalesNeeded = averageTicket > 0 ? Math.ceil(remaining / averageTicket) : 0;
  const progressPercentage = goal > 0 ? Math.min(currentRevenue / goal, 1) : 0;

  return { remaining, estimatedSalesNeeded, progressPercentage };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/unit/finance/goals.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Escrever o teste de `calculateStockPotential` que falha**

```typescript
import { describe, it, expect } from "vitest";
import { calculateStockPotential, meetsGoalWithStock } from "@/lib/finance/stock-potential";

describe("calculateStockPotential", () => {
  it("soma quantidade em estoque vezes preço de venda de cada produto", () => {
    const potential = calculateStockPotential([
      { stockQuantity: 100, currentPrice: 400 },
      { stockQuantity: 50, currentPrice: 500 },
    ]);
    expect(potential).toBe(65000);
  });

  it("meetsGoalWithStock indica se o potencial cobre a meta", () => {
    expect(meetsGoalWithStock(65000, 50000)).toBe(true);
    expect(meetsGoalWithStock(30000, 50000)).toBe(false);
  });
});
```

- [ ] **Step 6: Rodar e confirmar que falha**

Run: `npm run test -- tests/unit/finance/stock-potential.test.ts`
Expected: FAIL com "Cannot find module '@/lib/finance/stock-potential'"

- [ ] **Step 7: Implementar `lib/finance/stock-potential.ts`**

```typescript
export interface StockPotentialItem {
  stockQuantity: number;
  currentPrice: number;
}

export function calculateStockPotential(products: StockPotentialItem[]): number {
  return products.reduce((sum, p) => sum + p.stockQuantity * p.currentPrice, 0);
}

export function meetsGoalWithStock(potential: number, goal: number): boolean {
  return potential >= goal;
}
```

- [ ] **Step 8: Rodar e confirmar que passa**

Run: `npm run test -- tests/unit/finance/stock-potential.test.ts`
Expected: `2 passed`

- [ ] **Step 9: Commit**

```bash
git add lib/finance/goals.ts lib/finance/stock-potential.ts tests/unit/finance
git commit -m "feat(finance): progresso de meta e potencial de faturamento do estoque"
```

---

## Task 12: Cliente Mercado Pago — criação de preferência

**Files:**
- Create: `lib/mercadopago/client.ts`

**Interfaces:**
- Consumes: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_APP_URL` (env vars da Task 2)
- Produces: `createMercadoPagoPreference(input): Promise<MercadoPagoPreference>` — consumido
  pela Task 13.

- [ ] **Step 1: Implementar `lib/mercadopago/client.ts`**

```typescript
export interface MercadoPagoPreference {
  id: string;
  init_point: string;
}

export interface CreatePreferenceInput {
  externalReference: string;
  payerEmail: string;
}

export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<MercadoPagoPreference> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: "Faturio — Acesso completo",
          quantity: 1,
          unit_price: 129.9,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      back_urls: {
        success: `${appUrl}/pagamento/sucesso`,
        pending: `${appUrl}/pagamento/pendente`,
        failure: `${appUrl}/pagamento/recusado`,
      },
      auto_return: "approved",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao criar preferência no Mercado Pago: ${response.status}`);
  }

  return response.json();
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/mercadopago/client.ts
git commit -m "feat(pagamento): criação de preferência de checkout no Mercado Pago"
```

---

## Task 13: Checkout — Server Action e página

**Files:**
- Create: `lib/actions/checkout.ts`
- Create: `app/checkout/page.tsx`

**Interfaces:**
- Consumes: `createAdminClient` (Task 7), `createMercadoPagoPreference` (Task 12)
- Produces: `startCheckout(input): Promise<CheckoutResult>`, linha em `pending_checkouts` —
  ponto de partida lido pela Task 14 (webhook) via `external_reference`.

Nota de escopo: o visual desta página é funcional, não a versão final de design premium —
isso é responsabilidade do Plano 3 (Landing Page).

- [ ] **Step 1: Implementar a Server Action `lib/actions/checkout.ts`**

```typescript
"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMercadoPagoPreference } from "@/lib/mercadopago/client";

const checkoutSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
});

export interface CheckoutResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function startCheckout(input: {
  name: string;
  email: string;
}): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();

  const { data: checkout, error } = await admin
    .from("pending_checkouts")
    .insert({ name: parsed.data.name, email: parsed.data.email })
    .select()
    .single();

  if (error || !checkout) {
    return { success: false, error: "Não foi possível iniciar o checkout. Tente novamente." };
  }

  try {
    const preference = await createMercadoPagoPreference({
      externalReference: checkout.id,
      payerEmail: parsed.data.email,
    });
    return { success: true, redirectUrl: preference.init_point };
  } catch {
    return { success: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}
```

- [ ] **Step 2: Implementar `app/checkout/page.tsx`**

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { startCheckout } from "@/lib/actions/checkout";

const formSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CheckoutPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await startCheckout(values);
    if (!result.success || !result.redirectUrl) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    window.location.href = result.redirectUrl;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Começar agora</h1>
        <p className="text-muted-foreground">
          Acesso completo por R$ 129,90 (pagamento único).
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Nome completo
          </label>
          <input id="name" {...register("name")} className="w-full rounded-md border px-3 py-2" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Redirecionando..." : "Ir para pagamento — R$ 129,90"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/checkout.ts app/checkout
git commit -m "feat(pagamento): fluxo de checkout com Mercado Pago"
```

---

## Task 14: Processamento do pagamento e webhook do Mercado Pago

**Files:**
- Create: `lib/mercadopago/process-payment.ts`
- Create: `app/api/webhooks/mercadopago/route.ts`

**Interfaces:**
- Consumes: `createAdminClient` (Task 7)
- Produces: `processPayment(payment: MercadoPagoPayment): Promise<ProcessPaymentResult>` —
  consumido pela Task 15 (teste de idempotência) e pela própria rota do webhook.

A verificação de assinatura e a busca do pagamento na API do Mercado Pago ficam isoladas no
Route Handler; `processPayment` recebe um objeto já validado, o que permite testar a
idempotência sem depender de rede ou de segredos do Mercado Pago.

- [ ] **Step 1: Implementar `lib/mercadopago/process-payment.ts`**

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

export interface MercadoPagoPayment {
  id: string;
  status: string;
  externalReference: string;
}

export interface ProcessPaymentResult {
  created: boolean;
  reason?: "already_processed" | "not_approved";
  userId?: string;
}

export async function processPayment(
  payment: MercadoPagoPayment
): Promise<ProcessPaymentResult> {
  const admin = createAdminClient();

  const { data: checkout, error: checkoutError } = await admin
    .from("pending_checkouts")
    .select()
    .eq("id", payment.externalReference)
    .single();

  if (checkoutError || !checkout) {
    throw new Error(
      `pending_checkout não encontrado para external_reference=${payment.externalReference}`
    );
  }

  if (payment.status !== "approved") {
    await admin
      .from("pending_checkouts")
      .update({ status: "failed", mercadopago_payment_id: payment.id })
      .eq("id", checkout.id);
    return { created: false, reason: "not_approved" };
  }

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("mercadopago_payment_id", payment.id)
    .maybeSingle();

  if (existing) {
    return { created: false, reason: "already_processed" };
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    checkout.email,
    { data: { name: checkout.name } }
  );

  if (inviteError || !invited.user) {
    throw new Error(`Falha ao convidar usuário: ${inviteError?.message}`);
  }

  const userId = invited.user.id;

  await admin.from("profiles").insert({ id: userId, name: checkout.name, email: checkout.email });

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: userId,
    status: "active",
    mercadopago_payment_id: payment.id,
    amount: 129.9,
    started_at: new Date().toISOString(),
  });

  if (subError) {
    // 23505 = unique_violation — outra chamada concorrente do webhook já processou
    if (subError.code === "23505") {
      return { created: false, reason: "already_processed" };
    }
    throw subError;
  }

  await admin.from("settings").insert({ user_id: userId });

  await admin
    .from("pending_checkouts")
    .update({ status: "completed", mercadopago_payment_id: payment.id })
    .eq("id", checkout.id);

  return { created: true, userId };
}
```

- [ ] **Step 2: Implementar `app/api/webhooks/mercadopago/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { processPayment } from "@/lib/mercadopago/process-payment";

function verifySignature(request: NextRequest, dataId: string): boolean {
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET!)
    .update(manifest)
    .digest("hex");

  const hashBuffer = Buffer.from(hash);
  const expectedBuffer = Buffer.from(expectedHash);
  if (hashBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const dataId = body?.data?.id;

  if (!dataId) {
    return NextResponse.json({ error: "missing data.id" }, { status: 400 });
  }

  if (!verifySignature(request, String(dataId))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  });

  if (!mpResponse.ok) {
    return NextResponse.json({ error: "failed to fetch payment" }, { status: 502 });
  }

  const payment = await mpResponse.json();

  await processPayment({
    id: String(payment.id),
    status: payment.status,
    externalReference: payment.external_reference,
  });

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/mercadopago/process-payment.ts app/api/webhooks
git commit -m "feat(pagamento): processa confirmação do Mercado Pago com verificação de assinatura"
```

---

## Task 15: Teste de idempotência do webhook

**Files:**
- Test: `tests/integration/webhook-idempotency.test.ts`

**Interfaces:**
- Consumes: `processPayment` (Task 14)
- Produces: garantia automatizada de que reenviar o mesmo `payment_id` não duplica conta nem
  assinatura (seções 9 e 55 da spec).

- [ ] **Step 1: Escrever o teste**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { processPayment } from "@/lib/mercadopago/process-payment";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

describe("processPayment — idempotência do webhook", () => {
  const email = `webhook-test-${Date.now()}@faturio-test.com`;
  let checkoutId: string;
  let createdUserId: string | undefined;

  beforeAll(async () => {
    const { data } = await admin
      .from("pending_checkouts")
      .insert({ name: "Cliente Teste", email })
      .select()
      .single();
    checkoutId = data!.id;
  });

  afterAll(async () => {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    await admin.from("pending_checkouts").delete().eq("id", checkoutId);
  });

  it("processa o pagamento aprovado uma vez e cria a assinatura", async () => {
    const result = await processPayment({
      id: "payment-123",
      status: "approved",
      externalReference: checkoutId,
    });
    expect(result.created).toBe(true);
    createdUserId = result.userId;

    const { data: subs } = await admin
      .from("subscriptions")
      .select()
      .eq("mercadopago_payment_id", "payment-123");
    expect(subs).toHaveLength(1);
  });

  it("processar o mesmo payment_id de novo não duplica a assinatura", async () => {
    const result = await processPayment({
      id: "payment-123",
      status: "approved",
      externalReference: checkoutId,
    });
    expect(result.created).toBe(false);
    expect(result.reason).toBe("already_processed");

    const { data: subs } = await admin
      .from("subscriptions")
      .select()
      .eq("mercadopago_payment_id", "payment-123");
    expect(subs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que passa (com as variáveis de `.env.local` carregadas —
  `set -a && source .env.local && set +a` antes do comando)**

Run: `npm run test:integration`
Expected: `2 passed` (mais os 4 do teste de isolamento da Task 9 — total `6 passed`)

- [ ] **Step 3: Commit**

```bash
git add tests/integration/webhook-idempotency.test.ts
git commit -m "test: idempotência do webhook do Mercado Pago"
```

---

## Task 16: Páginas de status de pagamento

**Files:**
- Create: `app/pagamento/sucesso/page.tsx`
- Create: `app/pagamento/pendente/page.tsx`
- Create: `app/pagamento/recusado/page.tsx`

**Interfaces:**
- Produces: rotas de retorno do Mercado Pago (`back_urls` configuradas na Task 12) — apenas
  feedback visual, nunca fonte de liberação de acesso.

Nota de escopo: visual funcional, o design final destas páginas é responsabilidade do Plano 3.

- [ ] **Step 1: Criar `app/pagamento/sucesso/page.tsx`**

```typescript
import Link from "next/link";

export default function PagamentoSucessoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Pagamento confirmado!</h1>
      <p className="text-muted-foreground">
        Seu acesso foi liberado. Enviamos um e-mail para você definir sua senha e entrar.
      </p>
      <Link href="/login" className="rounded-md bg-black px-4 py-2 text-white">
        Acessar minha dashboard
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Criar `app/pagamento/pendente/page.tsx`**

```typescript
export default function PagamentoPendentePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Estamos aguardando a confirmação do pagamento.</h1>
      <p className="text-muted-foreground">
        Assim que o pagamento for confirmado, você receberá um e-mail com o acesso.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Criar `app/pagamento/recusado/page.tsx`**

```typescript
import Link from "next/link";

export default function PagamentoRecusadoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Não foi possível concluir seu pagamento.</h1>
      <Link href="/checkout" className="rounded-md bg-black px-4 py-2 text-white">
        Tentar novamente
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/pagamento
git commit -m "feat(pagamento): páginas de retorno sucesso/pendente/recusado"
```

---

## Task 17: Página de login

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/client.ts` (Task 7)
- Produces: rota `/login` usada pelo middleware (Task 8) como destino de redirecionamento.

- [ ] **Step 1: Implementar `app/login/page.tsx`**

```typescript
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const formSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "Senha muito curta"),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/esqueci-senha" className="underline">
          Esqueci minha senha
        </Link>
        <Link href="/checkout" className="underline">
          Não possui uma conta? Comece agora.
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/login
git commit -m "feat(auth): página de login"
```

---

## Task 18: Placeholder de dashboard protegida e verificação final

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts` (Task 7), protegido pelo `middleware.ts`
  (Task 8)
- Produces: rota `/dashboard` funcional (conteúdo completo do dashboard é escopo do Plano 3)
  provando que todo o fluxo de fundação funciona ponta a ponta.

- [ ] **Step 1: Implementar `app/dashboard/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Bem-vindo, {user?.email}.</p>
      <p className="mt-4 text-sm text-muted-foreground">
        Conteúdo completo do dashboard (metas, estoque, vendas, gráficos) é implementado no
        Plano 3.
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Rodar toda a suíte de testes**

Run: `set -a && source .env.local && set +a && npm run test && npm run test:integration`
Expected: todos os testes passando (sanidade + precificação + meta + estoque potencial +
isolamento multi-tenant + idempotência do webhook).

- [ ] **Step 3: Verificar build de produção**

Run: `npx tsc --noEmit && npm run build`
Expected: build concluído sem erros.

- [ ] **Step 4: Commit final**

```bash
git add app/dashboard
git commit -m "feat: dashboard protegida (placeholder) — fundação do Faturio completa"
```
