# Faturio — Plano 4: Motor de Negócio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o motor de negócio funcional do Faturio: onboarding obrigatório, CRUD de produtos com precificação sugerida, gestão de estoque, registro de vendas (transação atômica via função Postgres), metas mensais, configurações, e o dashboard real (cards + gráfico) — substituindo o placeholder atual.

**Architecture:** Server Actions por domínio em `lib/actions/`, usando `lib/supabase/server.ts` (cliente que respeita RLS, `user_id` sempre lido de `supabase.auth.getUser()` no servidor). Layout autenticado com sidebar em `app/dashboard/layout.tsx`. Venda é a única mutação multi-tabela — resolvida com uma função Postgres (`register_sale`, `security invoker`) chamada via `supabase.rpc()`, garantindo atomicidade sem sair do modelo RLS.

**Tech Stack:** Next.js 16, TypeScript, React 19, Tailwind CSS 4, Supabase (Postgres + RLS), react-hook-form + Zod, Recharts, Vitest.

## Global Constraints

- Server Actions usam `lib/supabase/server.ts` — `user_id` sempre lido de `supabase.auth.getUser()` no servidor, nunca recebido do client (regra crítica do AGENTS.md).
- `register_sale` roda com `security invoker` — mantém RLS e `auth.uid()` ativos, não usa `service_role`.
- Preço sugerido de produto: `fixedCostsPerUnit = cost + entryShipping + settings.packagingCost + settings.shippingCost`; `feesPercentage = settings.adminFee + settings.cardFee`; `desiredMargin = product.desiredMargin ?? settings.desiredMargin` — via `calculateRecommendedPrice` (já existe em `lib/finance/pricing.ts`).
- Estoque nunca negativo — validado no servidor antes de aplicar qualquer decremento (criação de produto, movimento de estoque, venda).
- As duas próximas migrations começam em `20260810000004` (as anteriores, `...000002` e `...000003`, já existem no repositório).
- Verificação por task: `npx tsc --noEmit` sempre. Tasks que tocam rotas (`app/**/page.tsx`, `app/**/layout.tsx`) também rodam `npm run build`. Tasks com lógica financeira nova (`lib/finance/**`) seguem TDD (teste falha → implementa → teste passa). `register_sale` tem teste de integração dedicado contra o Postgres real (`npm run test:integration`, variáveis carregadas via `set -a && source .env.local && set +a`). A task final faz verificação manual ponta a ponta com `npm run dev` e screenshot das páginas principais.
- Gerenciador de pacotes: npm.
- Nomenclatura de arquivos/rotas em português, consistente com o restante do projeto (`/dashboard/produtos`, `/dashboard/estoque`, etc.).

---

## Task 1: Migration — coluna `onboarding_completed`

**Files:**
- Create: `supabase/migrations/20260810000004_onboarding_gate.sql`

**Interfaces:**
- Produces: coluna `settings.onboarding_completed boolean not null default false` — consumida pela Task 7 (gate no `proxy.ts` e Server Action de onboarding).

- [ ] **Step 1: Escrever a migration**

```sql
alter table public.settings
  add column onboarding_completed boolean not null default false;
```

Salve como `supabase/migrations/20260810000004_onboarding_gate.sql`.

- [ ] **Step 2: Aplicar e verificar**

```bash
npx supabase db push --linked
npx supabase db query --linked "select column_name from information_schema.columns where table_name = 'settings' and column_name = 'onboarding_completed';"
```

Expected: a coluna aparece na saída.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260810000004_onboarding_gate.sql
git commit -m "feat(db): coluna onboarding_completed em settings"
```

---

## Task 2: Migration — função `register_sale`

**Files:**
- Create: `supabase/migrations/20260810000005_register_sale_function.sql`

**Interfaces:**
- Consumes: tabelas `sales`, `sale_items`, `inventory_movements`, `products`, `settings` (Plano 1), FK composta `products(id, user_id)` (migration `20260810000003`).
- Produces: função `public.register_sale(p_items jsonb, p_payment_method text, p_discount numeric default 0, p_sale_date timestamptz default now()) returns uuid` — consumida pela Task 11 (`lib/actions/sales.ts`) via `supabase.rpc("register_sale", ...)` e testada pela Task 12.

`p_items` é um array JSON de objetos `{product_id: uuid, quantity: int, unit_price: numeric}`.

- [ ] **Step 1: Escrever a migration**

```sql
create or replace function public.register_sale(
  p_items jsonb,
  p_payment_method text,
  p_discount numeric default 0,
  p_sale_date timestamptz default now()
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale_id uuid;
  v_item jsonb;
  v_stock_check record;
  v_quantity integer;
  v_unit_price numeric;
  v_unit_cost numeric;
  v_subtotal numeric;
  v_profit numeric;
  v_gross_revenue numeric;
  v_net_profit numeric;
  v_packaging_cost numeric;
  v_gift_cost numeric;
  v_shipping_cost numeric;
  v_traffic_cost numeric;
  v_admin_fee numeric;
  v_card_fee numeric;
  v_fees numeric;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A venda precisa ter ao menos um item';
  end if;

  select packaging_cost, gift_cost, shipping_cost, traffic_cost, admin_fee, card_fee
    into v_packaging_cost, v_gift_cost, v_shipping_cost, v_traffic_cost, v_admin_fee, v_card_fee
  from public.settings
  where user_id = v_user_id;

  if not found then
    raise exception 'Configurações não encontradas para o usuário';
  end if;

  -- valida estoque suficiente por produto, somando quantidades repetidas do mesmo produto
  for v_stock_check in
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer) as total_quantity
    from jsonb_array_elements(p_items) as item
    group by item->>'product_id'
  loop
    perform 1 from public.products
      where id = v_stock_check.product_id
        and user_id = v_user_id
        and stock_quantity >= v_stock_check.total_quantity;
    if not found then
      raise exception 'Produto não encontrado ou estoque insuficiente para o produto %', v_stock_check.product_id;
    end if;
  end loop;

  select sum((item->>'quantity')::integer * (item->>'unit_price')::numeric)
    into v_gross_revenue
  from jsonb_array_elements(p_items) as item;

  v_gross_revenue := v_gross_revenue - coalesce(p_discount, 0);
  v_fees := v_gross_revenue * (v_admin_fee + v_card_fee);

  insert into public.sales (
    user_id, sale_date, payment_method, discount, gross_revenue, fees,
    shipping_cost, packaging_cost, gift_cost, traffic_cost, net_profit
  ) values (
    v_user_id, p_sale_date, p_payment_method, coalesce(p_discount, 0), v_gross_revenue, v_fees,
    v_shipping_cost, v_packaging_cost, v_gift_cost, v_traffic_cost, 0
  ) returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    select cost into v_unit_cost from public.products
      where id = (v_item->>'product_id')::uuid and user_id = v_user_id;

    v_subtotal := v_quantity * v_unit_price;
    v_profit := v_subtotal - (v_quantity * v_unit_cost);

    insert into public.sale_items (
      user_id, sale_id, product_id, quantity, unit_price, unit_cost, subtotal, profit
    ) values (
      v_user_id, v_sale_id, (v_item->>'product_id')::uuid, v_quantity, v_unit_price, v_unit_cost, v_subtotal, v_profit
    );

    insert into public.inventory_movements (
      user_id, product_id, type, quantity, reason
    ) values (
      v_user_id, (v_item->>'product_id')::uuid, 'sale', -v_quantity, 'Venda ' || v_sale_id::text
    );

    update public.products
      set stock_quantity = stock_quantity - v_quantity, updated_at = now()
      where id = (v_item->>'product_id')::uuid and user_id = v_user_id;
  end loop;

  select sum(profit) into v_net_profit from public.sale_items where sale_id = v_sale_id;
  v_net_profit := v_net_profit - v_fees - v_shipping_cost - v_packaging_cost - v_gift_cost - v_traffic_cost;

  update public.sales set net_profit = v_net_profit where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.register_sale(jsonb, text, numeric, timestamptz) to authenticated;
```

Salve como `supabase/migrations/20260810000005_register_sale_function.sql`.

- [ ] **Step 2: Aplicar e verificar que a função existe**

```bash
npx supabase db push --linked
npx supabase db query --linked "select proname from pg_proc where proname = 'register_sale';"
```

Expected: `register_sale` na saída.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260810000005_register_sale_function.sql
git commit -m "feat(db): função register_sale — transação atômica de venda"
```

---

## Task 3: `lib/finance/projection.ts` — ticket médio e projeção mensal

**Files:**
- Create: `lib/finance/projection.ts`
- Test: `tests/unit/finance/projection.test.ts`

**Interfaces:**
- Produces: `calculateAverageTicket(totalRevenue, salesCount): number`, `calculateMonthProjection(currentRevenue, dayOfMonth, daysInMonth): number` — usados pela Task 15 (dashboard).

- [ ] **Step 1: Escrever os testes que falham**

```typescript
import { describe, it, expect } from "vitest";
import { calculateAverageTicket, calculateMonthProjection } from "@/lib/finance/projection";

describe("calculateAverageTicket", () => {
  it("divide o faturamento pelo número de vendas", () => {
    expect(calculateAverageTicket(1000, 8)).toBe(125);
  });

  it("retorna 0 quando não há vendas", () => {
    expect(calculateAverageTicket(0, 0)).toBe(0);
  });
});

describe("calculateMonthProjection", () => {
  it("projeta o faturamento do mês por regra de três simples", () => {
    expect(calculateMonthProjection(15000, 10, 30)).toBe(45000);
  });

  it("retorna 0 quando o dia do mês é 0", () => {
    expect(calculateMonthProjection(1000, 0, 30)).toBe(0);
  });
});
```

Salve como `tests/unit/finance/projection.test.ts`.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- tests/unit/finance/projection.test.ts`
Expected: FAIL com "Cannot find module '@/lib/finance/projection'"

- [ ] **Step 3: Implementar**

```typescript
export function calculateAverageTicket(totalRevenue: number, salesCount: number): number {
  return salesCount > 0 ? totalRevenue / salesCount : 0;
}

export function calculateMonthProjection(
  currentRevenue: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  if (dayOfMonth <= 0) return 0;
  return (currentRevenue / dayOfMonth) * daysInMonth;
}
```

Salve como `lib/finance/projection.ts`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test -- tests/unit/finance/projection.test.ts`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/finance/projection.ts tests/unit/finance/projection.test.ts
git commit -m "feat(finance): ticket médio e projeção mensal de faturamento"
```

---

## Task 4: Componentes base — Table e Select

**Files:**
- Create: `components/ui/table.tsx`
- Create: `components/ui/select.tsx`

**Interfaces:**
- Consumes: `cn` de `lib/utils.ts`
- Produces: `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Select` — usados pelas Tasks 9-14 (listas e formulários).

- [ ] **Step 1: Criar `components/ui/table.tsx`**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full text-sm", className)} {...props} />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("border-b border-border text-left text-muted-foreground", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-border", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("transition-colors hover:bg-muted/50", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("px-4 py-3 text-xs font-medium uppercase tracking-wide", className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-4 py-3 text-foreground", className)} {...props} />
));
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

- [ ] **Step 2: Criar `components/ui/select.tsx`**

```typescript
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "flex h-11 w-full appearance-none rounded-[10px] border bg-card px-3.5 py-2 pr-9 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            invalid ? "border-destructive focus-visible:ring-destructive" : "border-input",
            className
          )}
          aria-invalid={invalid || undefined}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/ui/table.tsx components/ui/select.tsx
git commit -m "feat(design): componentes Table e Select"
```

---

## Task 5: Sidebar e layout autenticado

**Files:**
- Create: `components/dashboard/sidebar.tsx`
- Create: `app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `cn` de `lib/utils.ts`
- Produces: `Sidebar` e o layout de `app/dashboard/layout.tsx` — envolve todas as páginas de `/dashboard/**` das Tasks seguintes.

- [ ] **Step 1: Criar `components/dashboard/sidebar.tsx`**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Target,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/estoque", label: "Estoque", icon: Boxes },
  { href: "/dashboard/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/dashboard/metas", label: "Metas", icon: Target },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-6 md:hidden">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="border-b border-border px-6 py-4 md:hidden">
          <SidebarLinks onNavigate={() => setOpen(false)} />
        </div>
      )}
      <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:flex md:flex-col md:gap-6">
        <Link href="/dashboard" className="px-2 text-lg font-bold tracking-tight text-foreground">
          Faturio
        </Link>
        <SidebarLinks />
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Criar `app/dashboard/layout.tsx`**

```typescript
import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 4: Screenshot de verificação**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
node scripts/screenshot.mjs http://localhost:3100/dashboard screenshots/dashboard-layout.png light
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

Expected: a captura mostra a sidebar à esquerda (desktop) envolvendo o placeholder atual do
dashboard. Sem sessão ativa a página redireciona para `/login` — nesse caso, confirme
visualmente rodando `npm run dev` e logando manualmente com um usuário de teste.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/sidebar.tsx app/dashboard/layout.tsx
git commit -m "feat(dashboard): sidebar e layout autenticado"
```

---

## Task 6: Validação compartilhada de configurações

**Files:**
- Create: `lib/validations/settings.ts`
- Create: `components/settings/settings-form-fields.tsx`

**Interfaces:**
- Produces: `settingsFieldsBaseSchema`, `settingsFieldsSchema`, `feesBelow100Percent`, tipo
  `SettingsFieldsValues` — consumidos pelas Tasks 7 (onboarding) e 8 (configurações).
  `SettingsFormFields` — componente de UI reutilizado pelas mesmas duas tasks.

- [ ] **Step 1: Criar `lib/validations/settings.ts`**

```typescript
import { z } from "zod";

export const settingsFieldsBaseSchema = z.object({
  packagingCost: z.number().min(0, "Não pode ser negativo"),
  giftCost: z.number().min(0, "Não pode ser negativo"),
  shippingCost: z.number().min(0, "Não pode ser negativo"),
  adminFee: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
  cardFee: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
  trafficCost: z.number().min(0, "Não pode ser negativo"),
  desiredMargin: z.number().min(0).max(0.9999, "Informe um percentual menor que 100%"),
});

export type SettingsFieldsValues = z.infer<typeof settingsFieldsBaseSchema>;

export function feesBelow100Percent(data: {
  adminFee: number;
  cardFee: number;
  desiredMargin: number;
}) {
  return data.adminFee + data.cardFee + data.desiredMargin < 1;
}

export const settingsFieldsSchema = settingsFieldsBaseSchema.refine(feesBelow100Percent, {
  message:
    "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
  path: ["desiredMargin"],
});
```

- [ ] **Step 2: Criar `components/settings/settings-form-fields.tsx`**

```typescript
"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { SettingsFieldsValues } from "@/lib/validations/settings";

interface SettingsFormFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

const fields: { name: keyof SettingsFieldsValues; label: string; step: string }[] = [
  { name: "packagingCost", label: "Custo de embalagem (R$)", step: "0.01" },
  { name: "shippingCost", label: "Frete médio (R$)", step: "0.01" },
  { name: "giftCost", label: "Custo de brinde (R$)", step: "0.01" },
  { name: "trafficCost", label: "Custo médio de tráfego por venda (R$)", step: "0.01" },
  { name: "adminFee", label: "Taxa administrativa (ex: 0.05 para 5%)", step: "0.0001" },
  { name: "cardFee", label: "Taxa de cartão (ex: 0.03 para 3%)", step: "0.0001" },
  { name: "desiredMargin", label: "Margem desejada (ex: 0.3 para 30%)", step: "0.0001" },
];

export function SettingsFormFields({ register, errors }: SettingsFormFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-foreground">
            {field.label}
          </label>
          <Input
            id={field.name}
            type="number"
            step={field.step}
            invalid={!!errors[field.name]}
            {...register(field.name, { valueAsNumber: true })}
          />
          {errors[field.name] && (
            <p className="mt-1.5 text-sm text-destructive">{String(errors[field.name]?.message)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/validations/settings.ts components/settings/settings-form-fields.tsx
git commit -m "feat(settings): schema e campos compartilhados de configurações"
```

---

## Task 7: Onboarding (Server Action, página e gate)

**Files:**
- Create: `lib/actions/onboarding.ts`
- Create: `app/onboarding/page.tsx`
- Create: `components/onboarding/onboarding-form.tsx`
- Modify: `proxy.ts`

**Interfaces:**
- Consumes: `settingsFieldsBaseSchema`, `feesBelow100Percent` (Task 6), `SettingsFormFields`
  (Task 6), `lib/supabase/server.ts` (Plano 1).
- Produces: rota `/onboarding` funcional; `completeOnboarding(input): Promise<OnboardingResult>`.
  `proxy.ts` passa a redirecionar para `/onboarding` quando `settings.onboarding_completed` for
  `false`.

- [ ] **Step 1: Criar `lib/actions/onboarding.ts`**

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settingsFieldsBaseSchema, feesBelow100Percent } from "@/lib/validations/settings";

const onboardingSchema = settingsFieldsBaseSchema
  .extend({ revenueGoal: z.number().min(0, "Informe uma meta válida") })
  .refine(feesBelow100Percent, {
    message:
      "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
    path: ["desiredMargin"],
  });

export interface OnboardingResult {
  success: boolean;
  error?: string;
}

export async function completeOnboarding(
  input: z.infer<typeof onboardingSchema>
): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { error: settingsError } = await supabase
    .from("settings")
    .update({
      packaging_cost: parsed.data.packagingCost,
      gift_cost: parsed.data.giftCost,
      shipping_cost: parsed.data.shippingCost,
      admin_fee: parsed.data.adminFee,
      card_fee: parsed.data.cardFee,
      traffic_cost: parsed.data.trafficCost,
      desired_margin: parsed.data.desiredMargin,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (settingsError) {
    return { success: false, error: "Não foi possível salvar suas configurações. Tente novamente." };
  }

  const now = new Date();
  const { error: goalError } = await supabase.from("goals").insert({
    user_id: user.id,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    revenue_goal: parsed.data.revenueGoal,
    desired_margin: parsed.data.desiredMargin,
  });

  if (goalError) {
    return {
      success: false,
      error: "Configurações salvas, mas não foi possível criar a meta do mês. Tente novamente.",
    };
  }

  return { success: true };
}
```

- [ ] **Step 2: Criar `components/onboarding/onboarding-form.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { settingsFieldsBaseSchema, feesBelow100Percent } from "@/lib/validations/settings";
import { SettingsFormFields } from "@/components/settings/settings-form-fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = settingsFieldsBaseSchema
  .extend({ revenueGoal: z.number().min(0, "Informe uma meta válida") })
  .refine(feesBelow100Percent, {
    message:
      "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
    path: ["desiredMargin"],
  });

type FormValues = z.infer<typeof formSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await completeOnboarding(values);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div>
        <label htmlFor="revenueGoal" className="mb-1.5 block text-sm font-medium text-foreground">
          Meta de faturamento deste mês (R$)
        </label>
        <Input
          id="revenueGoal"
          type="number"
          step="0.01"
          invalid={!!errors.revenueGoal}
          {...register("revenueGoal", { valueAsNumber: true })}
        />
        {errors.revenueGoal && (
          <p className="mt-1.5 text-sm text-destructive">{errors.revenueGoal.message}</p>
        )}
      </div>

      <SettingsFormFields register={register} errors={errors} />

      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Concluir e ir para o painel"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Criar `app/onboarding/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vamos configurar seu painel</h1>
        <p className="text-muted-foreground">
          Responda as perguntas abaixo para personalizar seus cálculos de preço e sua meta.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
```

- [ ] **Step 4: Adicionar o gate de onboarding em `proxy.ts`**

Adicione a checagem abaixo em `proxy.ts`, depois da checagem de assinatura ativa existente e
antes do `return response;` final (preserve o padrão de encaminhar cookies em cada redirect,
já usado pelas checagens de sessão e assinatura):

```typescript
  const { data: settings } = await supabase
    .from("settings")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.onboarding_completed) {
    const onboardingResponse = NextResponse.redirect(new URL("/onboarding", request.url));
    response.cookies.getAll().forEach(cookie => {
      onboardingResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return onboardingResponse;
  }

  return response;
```

O `config.matcher` continua `["/dashboard/:path*"]` — `/onboarding` fica fora do proxy (a
própria página já verifica a sessão no Step 3, evitando loop de redirecionamento).

- [ ] **Step 5: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/onboarding.ts app/onboarding components/onboarding proxy.ts
git commit -m "feat(onboarding): fluxo de 8 perguntas e gate obrigatório antes do dashboard"
```

---

## Task 8: Configurações

**Files:**
- Create: `lib/actions/settings.ts`
- Create: `components/settings/settings-form.tsx`
- Create: `app/dashboard/configuracoes/page.tsx`

**Interfaces:**
- Consumes: `settingsFieldsSchema`, `SettingsFieldsValues`, `SettingsFormFields` (Task 6).
- Produces: rota `/dashboard/configuracoes`; `updateSettings(input): Promise<SettingsActionResult>`.

- [ ] **Step 1: Criar `lib/actions/settings.ts`**

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settingsFieldsSchema } from "@/lib/validations/settings";

export interface SettingsActionResult {
  success: boolean;
  error?: string;
}

export async function updateSettings(
  input: z.infer<typeof settingsFieldsSchema>
): Promise<SettingsActionResult> {
  const parsed = settingsFieldsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase
    .from("settings")
    .update({
      packaging_cost: parsed.data.packagingCost,
      gift_cost: parsed.data.giftCost,
      shipping_cost: parsed.data.shippingCost,
      admin_fee: parsed.data.adminFee,
      card_fee: parsed.data.cardFee,
      traffic_cost: parsed.data.trafficCost,
      desired_margin: parsed.data.desiredMargin,
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Não foi possível salvar as configurações. Tente novamente." };
  }

  return { success: true };
}
```

- [ ] **Step 2: Criar `components/settings/settings-form.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettings } from "@/lib/actions/settings";
import { settingsFieldsSchema, type SettingsFieldsValues } from "@/lib/validations/settings";
import { SettingsFormFields } from "@/components/settings/settings-form-fields";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsForm({ defaultValues }: { defaultValues: SettingsFieldsValues }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFieldsValues>({ resolver: zodResolver(settingsFieldsSchema), defaultValues });

  async function onSubmit(values: SettingsFieldsValues) {
    setServerError(null);
    setSuccess(false);
    const result = await updateSettings(values);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <SettingsFormFields register={register} errors={errors} />
          {serverError && <Alert variant="destructive">{serverError}</Alert>}
          {success && <Alert>Configurações salvas com sucesso.</Alert>}
          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Salvando..." : "Salvar configurações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Criar `app/dashboard/configuracoes/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("settings")
    .select(
      "packaging_cost, gift_cost, shipping_cost, admin_fee, card_fee, traffic_cost, desired_margin"
    )
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Custos e taxas usados nos cálculos de preço e no dashboard.
        </p>
      </div>
      <SettingsForm
        defaultValues={{
          packagingCost: Number(settings?.packaging_cost ?? 0),
          giftCost: Number(settings?.gift_cost ?? 0),
          shippingCost: Number(settings?.shipping_cost ?? 0),
          adminFee: Number(settings?.admin_fee ?? 0),
          cardFee: Number(settings?.card_fee ?? 0),
          trafficCost: Number(settings?.traffic_cost ?? 0),
          desiredMargin: Number(settings?.desired_margin ?? 0),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/settings.ts components/settings/settings-form.tsx app/dashboard/configuracoes
git commit -m "feat(configuracoes): edição de custos e taxas pós-onboarding"
```

---

## Task 9: Produtos

**Files:**
- Create: `lib/actions/products.ts`
- Create: `components/produtos/product-form.tsx`
- Create: `app/dashboard/produtos/page.tsx`
- Create: `app/dashboard/produtos/novo/page.tsx`
- Create: `app/dashboard/produtos/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `calculateRecommendedPrice`, `PricingError` (`lib/finance/pricing.ts`, Plano 1),
  `Table`/`Select` (Task 4).
- Produces: `createProduct`, `updateProduct`, `deactivateProduct` — usados também pela Task 10
  (estoque, ao criar produto com estoque inicial) e Task 11 (vendas, ao listar produtos ativos).

- [ ] **Step 1: Criar `lib/actions/products.ts`**

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  name: z.string().min(1, "Informe o nome do produto"),
  sku: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().min(0, "Não pode ser negativo"),
  entryShipping: z.number().min(0, "Não pode ser negativo").default(0),
  currentPrice: z.number().min(0, "Não pode ser negativo").optional(),
  desiredMargin: z.number().min(0).max(0.9999).optional(),
  minimumStock: z.number().int().min(0).default(0),
});

export interface ProductActionResult {
  success: boolean;
  productId?: string;
  error?: string;
}

export async function createProduct(
  input: z.infer<typeof productSchema> & { initialStock?: number }
): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const initialStock = input.initialStock && input.initialStock > 0 ? input.initialStock : 0;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      supplier: parsed.data.supplier || null,
      cost: parsed.data.cost,
      entry_shipping: parsed.data.entryShipping,
      current_price: parsed.data.currentPrice ?? null,
      desired_margin: parsed.data.desiredMargin ?? null,
      stock_quantity: initialStock,
      minimum_stock: parsed.data.minimumStock,
    })
    .select()
    .single();

  if (error || !product) {
    return { success: false, error: "Não foi possível criar o produto. Tente novamente." };
  }

  if (initialStock > 0) {
    await supabase.from("inventory_movements").insert({
      user_id: user.id,
      product_id: product.id,
      type: "initial",
      quantity: initialStock,
      unit_cost: parsed.data.cost,
      reason: "Estoque inicial",
    });
  }

  return { success: true, productId: product.id };
}

export async function updateProduct(
  productId: string,
  input: z.infer<typeof productSchema>
): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category: parsed.data.category || null,
      supplier: parsed.data.supplier || null,
      cost: parsed.data.cost,
      entry_shipping: parsed.data.entryShipping,
      current_price: parsed.data.currentPrice ?? null,
      desired_margin: parsed.data.desiredMargin ?? null,
      minimum_stock: parsed.data.minimumStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    return { success: false, error: "Não foi possível salvar o produto. Tente novamente." };
  }

  return { success: true, productId };
}

export async function deactivateProduct(productId: string): Promise<ProductActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    return { success: false, error: "Não foi possível remover o produto. Tente novamente." };
  }

  return { success: true, productId };
}
```

Nota: `updateProduct`/`deactivateProduct` não fazem checagem extra de `user_id` — a política
RLS `products_update_own` (`using (user_id = auth.uid())`) já impede a alteração de produtos
de outro usuário; o `.eq("id", productId)` some silenciosamente se a linha não pertence ao
usuário autenticado.

- [ ] **Step 2: Criar `components/produtos/product-form.tsx`**

```typescript
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProduct, deactivateProduct, updateProduct } from "@/lib/actions/products";
import { calculateRecommendedPrice, PricingError } from "@/lib/finance/pricing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(1, "Informe o nome do produto"),
  sku: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  cost: z.number().min(0, "Não pode ser negativo"),
  entryShipping: z.number().min(0, "Não pode ser negativo").default(0),
  currentPrice: z.number().min(0, "Não pode ser negativo").optional(),
  desiredMargin: z.number().min(0).max(0.9999).optional(),
  minimumStock: z.number().int().min(0).default(0),
  initialStock: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProductFormSettings {
  packagingCost: number;
  shippingCost: number;
  adminFee: number;
  cardFee: number;
  desiredMargin: number;
}

export interface ProductFormProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  supplier: string | null;
  cost: number;
  entryShipping: number;
  currentPrice: number | null;
  desiredMargin: number | null;
  minimumStock: number;
}

export function ProductForm({
  product,
  settings,
}: {
  product?: ProductFormProduct;
  settings: ProductFormSettings;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku ?? "",
          category: product.category ?? "",
          supplier: product.supplier ?? "",
          cost: product.cost,
          entryShipping: product.entryShipping,
          currentPrice: product.currentPrice ?? undefined,
          desiredMargin: product.desiredMargin ?? undefined,
          minimumStock: product.minimumStock,
        }
      : { entryShipping: 0, minimumStock: 0 },
  });

  const cost = watch("cost") || 0;
  const entryShipping = watch("entryShipping") || 0;
  const desiredMargin = watch("desiredMargin") ?? settings.desiredMargin;

  const suggestedPrice = useMemo(() => {
    try {
      return calculateRecommendedPrice({
        fixedCostsPerUnit: cost + entryShipping + settings.packagingCost + settings.shippingCost,
        feesPercentage: settings.adminFee + settings.cardFee,
        desiredMargin,
      });
    } catch (error) {
      if (error instanceof PricingError) return null;
      throw error;
    }
  }, [cost, entryShipping, desiredMargin, settings]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = product ? await updateProduct(product.id, values) : await createProduct(values);

    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.push("/dashboard/produtos");
    router.refresh();
  }

  async function onDeactivate() {
    if (!product) return;
    setServerError(null);
    const result = await deactivateProduct(product.id);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.push("/dashboard/produtos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          Nome
        </label>
        <Input id="name" invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sku" className="mb-1.5 block text-sm font-medium text-foreground">
            SKU
          </label>
          <Input id="sku" {...register("sku")} />
        </div>
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-foreground">
            Categoria
          </label>
          <Input id="category" {...register("category")} />
        </div>
      </div>

      <div>
        <label htmlFor="supplier" className="mb-1.5 block text-sm font-medium text-foreground">
          Fornecedor
        </label>
        <Input id="supplier" {...register("supplier")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cost" className="mb-1.5 block text-sm font-medium text-foreground">
            Custo (R$)
          </label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            invalid={!!errors.cost}
            {...register("cost", { valueAsNumber: true })}
          />
          {errors.cost && <p className="mt-1.5 text-sm text-destructive">{errors.cost.message}</p>}
        </div>
        <div>
          <label htmlFor="entryShipping" className="mb-1.5 block text-sm font-medium text-foreground">
            Frete de entrada (R$)
          </label>
          <Input
            id="entryShipping"
            type="number"
            step="0.01"
            {...register("entryShipping", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="desiredMargin" className="mb-1.5 block text-sm font-medium text-foreground">
            Margem desejada (ex: 0.3 para 30%)
          </label>
          <Input
            id="desiredMargin"
            type="number"
            step="0.0001"
            {...register("desiredMargin", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label htmlFor="currentPrice" className="mb-1.5 block text-sm font-medium text-foreground">
            Preço de venda (R$)
          </label>
          <Input
            id="currentPrice"
            type="number"
            step="0.01"
            {...register("currentPrice", { valueAsNumber: true })}
          />
        </div>
      </div>

      {suggestedPrice !== null && (
        <p className="text-sm text-muted-foreground">
          Preço sugerido:{" "}
          <span className="font-semibold text-primary">
            {suggestedPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {!product && (
          <div>
            <label htmlFor="initialStock" className="mb-1.5 block text-sm font-medium text-foreground">
              Estoque inicial
            </label>
            <Input
              id="initialStock"
              type="number"
              step="1"
              {...register("initialStock", { valueAsNumber: true })}
            />
          </div>
        )}
        <div>
          <label htmlFor="minimumStock" className="mb-1.5 block text-sm font-medium text-foreground">
            Estoque mínimo
          </label>
          <Input
            id="minimumStock"
            type="number"
            step="1"
            {...register("minimumStock", { valueAsNumber: true })}
          />
        </div>
      </div>

      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : product ? "Salvar alterações" : "Criar produto"}
        </Button>
        {product && (
          <Button type="button" variant="secondary" onClick={onDeactivate}>
            Remover produto
          </Button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Criar `app/dashboard/produtos/page.tsx`**

```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, cost, current_price, stock_quantity, minimum_stock")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">Cadastre e gerencie os produtos que você vende.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/produtos/novo">Novo produto</Link>
        </Button>
      </div>

      {products && products.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">{product.category ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(Number(product.cost))}</TableCell>
                <TableCell className="tabular-nums">
                  {formatCurrency(product.current_price !== null ? Number(product.current_price) : null)}
                </TableCell>
                <TableCell
                  className={
                    product.stock_quantity < product.minimum_stock
                      ? "font-medium text-warning"
                      : "tabular-nums"
                  }
                >
                  {product.stock_quantity} un.
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/produtos/${product.id}/editar`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda —{" "}
          <Link href="/dashboard/produtos/novo" className="font-medium text-primary hover:underline">
            adicionar produto
          </Link>
          .
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Criar `app/dashboard/produtos/novo/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/produtos/product-form";

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase
    .from("settings")
    .select("packaging_cost, shipping_cost, admin_fee, card_fee, desired_margin")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Novo produto</h1>
      </div>
      <ProductForm
        settings={{
          packagingCost: Number(settings?.packaging_cost ?? 0),
          shippingCost: Number(settings?.shipping_cost ?? 0),
          adminFee: Number(settings?.admin_fee ?? 0),
          cardFee: Number(settings?.card_fee ?? 0),
          desiredMargin: Number(settings?.desired_margin ?? 0),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Criar `app/dashboard/produtos/[id]/editar/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/produtos/product-form";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, category, supplier, cost, entry_shipping, current_price, desired_margin, minimum_stock"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("settings")
      .select("packaging_cost, shipping_cost, admin_fee, card_fee, desired_margin")
      .eq("user_id", user!.id)
      .single(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Editar produto</h1>
      </div>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          supplier: product.supplier,
          cost: Number(product.cost),
          entryShipping: Number(product.entry_shipping),
          currentPrice: product.current_price !== null ? Number(product.current_price) : null,
          desiredMargin: product.desired_margin !== null ? Number(product.desired_margin) : null,
          minimumStock: product.minimum_stock,
        }}
        settings={{
          packagingCost: Number(settings?.packaging_cost ?? 0),
          shippingCost: Number(settings?.shipping_cost ?? 0),
          adminFee: Number(settings?.admin_fee ?? 0),
          cardFee: Number(settings?.card_fee ?? 0),
          desiredMargin: Number(settings?.desired_margin ?? 0),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add lib/actions/products.ts components/produtos app/dashboard/produtos
git commit -m "feat(produtos): CRUD com preço sugerido"
```

---

## Task 10: Estoque

**Files:**
- Create: `lib/actions/stock.ts`
- Create: `components/estoque/stock-movement-form.tsx`
- Create: `components/estoque/stock-list.tsx`
- Create: `app/dashboard/estoque/page.tsx`

**Interfaces:**
- Consumes: `Table`/`Select` (Task 4).
- Produces: `registerStockMovement(input): Promise<StockActionResult>`.

- [ ] **Step 1: Criar `lib/actions/stock.ts`**

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const movementSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(["entry", "adjustment", "return"]),
  quantity: z.number().int(),
  unitCost: z.number().min(0).optional(),
  reason: z.string().optional(),
});

export interface StockActionResult {
  success: boolean;
  error?: string;
}

export async function registerStockMovement(
  input: z.infer<typeof movementSchema>
): Promise<StockActionResult> {
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", parsed.data.productId)
    .single();

  if (productError || !product) {
    return { success: false, error: "Produto não encontrado." };
  }

  const delta =
    parsed.data.type === "adjustment" ? parsed.data.quantity : Math.abs(parsed.data.quantity);

  const newStock = product.stock_quantity + delta;
  if (newStock < 0) {
    return { success: false, error: "Esse ajuste deixaria o estoque negativo." };
  }

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    user_id: user.id,
    product_id: parsed.data.productId,
    type: parsed.data.type,
    quantity: delta,
    unit_cost: parsed.data.unitCost ?? null,
    reason: parsed.data.reason || null,
  });

  if (movementError) {
    return { success: false, error: "Não foi possível registrar o movimento. Tente novamente." };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.productId);

  if (updateError) {
    return { success: false, error: "Não foi possível atualizar o estoque. Tente novamente." };
  }

  return { success: true };
}
```

- [ ] **Step 2: Criar `components/estoque/stock-movement-form.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerStockMovement } from "@/lib/actions/stock";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  type: z.enum(["entry", "adjustment", "return"]),
  quantity: z.number().int().refine((v) => v !== 0, "Informe uma quantidade diferente de zero"),
  unitCost: z.number().min(0).optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function StockMovementForm({
  productId,
  onDone,
}: {
  productId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { type: "entry" } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await registerStockMovement({ ...values, productId });
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3 py-2">
      <div>
        <label htmlFor="type" className="mb-1.5 block text-xs font-medium text-foreground">
          Tipo
        </label>
        <Select id="type" {...register("type")}>
          <option value="entry">Entrada</option>
          <option value="adjustment">Ajuste (+/-)</option>
          <option value="return">Devolução</option>
        </Select>
      </div>
      <div>
        <label htmlFor="quantity" className="mb-1.5 block text-xs font-medium text-foreground">
          Quantidade
        </label>
        <Input
          id="quantity"
          type="number"
          step="1"
          className="w-28"
          invalid={!!errors.quantity}
          {...register("quantity", { valueAsNumber: true })}
        />
      </div>
      <div>
        <label htmlFor="unitCost" className="mb-1.5 block text-xs font-medium text-foreground">
          Custo unitário (opcional)
        </label>
        <Input
          id="unitCost"
          type="number"
          step="0.01"
          className="w-32"
          {...register("unitCost", { valueAsNumber: true })}
        />
      </div>
      <div className="flex-1 basis-40">
        <label htmlFor="reason" className="mb-1.5 block text-xs font-medium text-foreground">
          Motivo (opcional)
        </label>
        <Input id="reason" {...register("reason")} />
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Registrar"}
      </Button>
      {errors.quantity && (
        <p className="basis-full text-sm text-destructive">{errors.quantity.message}</p>
      )}
      {serverError && (
        <div className="basis-full">
          <Alert variant="destructive">{serverError}</Alert>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Criar `components/estoque/stock-list.tsx`**

```typescript
"use client";

import { Fragment, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StockMovementForm } from "@/components/estoque/stock-movement-form";
import { cn } from "@/lib/utils";

export interface StockListProduct {
  id: string;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
}

export function StockList({ products }: { products: StockListProduct[] }) {
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Estoque atual</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isLow = product.stock_quantity < product.minimum_stock;
          return (
            <Fragment key={product.id}>
              <TableRow>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      isLow && "rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning"
                    )}
                  >
                    {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                    {product.stock_quantity} un.
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenProductId(openProductId === product.id ? null : product.id)}
                  >
                    {openProductId === product.id ? "Fechar" : "Registrar movimento"}
                  </Button>
                </TableCell>
              </TableRow>
              {openProductId === product.id && (
                <TableRow>
                  <TableCell colSpan={3} className="bg-muted/40">
                    <StockMovementForm productId={product.id} onDone={() => setOpenProductId(null)} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Criar `app/dashboard/estoque/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { StockList } from "@/components/estoque/stock-list";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, stock_quantity, minimum_stock")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Estoque</h1>
        <p className="text-muted-foreground">Acompanhe e ajuste a quantidade de cada produto.</p>
      </div>
      <StockList products={products ?? []} />
    </div>
  );
}
```

- [ ] **Step 5: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/stock.ts components/estoque app/dashboard/estoque
git commit -m "feat(estoque): movimentações de entrada, ajuste e devolução"
```

---

## Task 11: Vendas

**Files:**
- Create: `lib/actions/sales.ts`
- Create: `components/vendas/sale-form.tsx`
- Create: `app/dashboard/vendas/page.tsx`
- Create: `app/dashboard/vendas/nova/page.tsx`

**Interfaces:**
- Consumes: função Postgres `register_sale` (Task 2), `Table`/`Select` (Task 4).
- Produces: `registerSale(input): Promise<RegisterSaleResult>`.

- [ ] **Step 1: Criar `lib/actions/sales.ts`**

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive("Informe uma quantidade válida"),
  unitPrice: z.number().min(0, "Informe um preço válido"),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um produto"),
  paymentMethod: z.string().min(1, "Informe a forma de pagamento"),
  discount: z.number().min(0).default(0),
});

export interface RegisterSaleResult {
  success: boolean;
  saleId?: string;
  error?: string;
}

export async function registerSale(
  input: z.infer<typeof saleSchema>
): Promise<RegisterSaleResult> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_sale", {
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    p_payment_method: parsed.data.paymentMethod,
    p_discount: parsed.data.discount,
  });

  if (error) {
    if (error.message.includes("estoque insuficiente")) {
      return { success: false, error: "Estoque insuficiente para um ou mais produtos." };
    }
    return { success: false, error: "Não foi possível registrar a venda. Tente novamente." };
  }

  return { success: true, saleId: data as string };
}
```

- [ ] **Step 2: Criar `components/vendas/sale-form.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { registerSale } from "@/lib/actions/sales";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  paymentMethod: z.string().min(1, "Selecione a forma de pagamento"),
  discount: z.number().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Selecione um produto"),
        quantity: z.number().int().positive("Informe uma quantidade válida"),
        unitPrice: z.number().min(0, "Informe um preço válido"),
      })
    )
    .min(1, "Adicione ao menos um produto"),
});

type FormValues = z.infer<typeof formSchema>;

export interface SaleFormProduct {
  id: string;
  name: string;
  currentPrice: number;
}

export function SaleForm({ products }: { products: SaleFormProduct[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      discount: 0,
      paymentMethod: "pix",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setValue(`items.${index}.unitPrice`, product?.currentPrice ?? 0);
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await registerSale(values);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.push("/dashboard/vendas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        {fields.map((field, index) => {
          const productField = register(`items.${index}.productId`);
          return (
            <div key={field.id} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Produto</label>
                <Select
                  {...productField}
                  onChange={(e) => {
                    productField.onChange(e);
                    handleProductChange(index, e.target.value);
                  }}
                  invalid={!!errors.items?.[index]?.productId}
                >
                  <option value="">Selecione</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-24">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Qtd.</label>
                <Input
                  type="number"
                  step="1"
                  invalid={!!errors.items?.[index]?.quantity}
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="w-32">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Preço unit. (R$)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.items?.[index]?.unitPrice}
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
        >
          <Plus className="h-4 w-4" /> Adicionar produto
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Forma de pagamento</label>
          <Select {...register("paymentMethod")} invalid={!!errors.paymentMethod}>
            <option value="pix">Pix</option>
            <option value="cartao_credito">Cartão de crédito</option>
            <option value="cartao_debito">Cartão de débito</option>
            <option value="dinheiro">Dinheiro</option>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Desconto (R$)</label>
          <Input type="number" step="0.01" {...register("discount", { valueAsNumber: true })} />
        </div>
      </div>

      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Registrando..." : "Registrar venda"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Criar `app/dashboard/vendas/page.tsx`**

```typescript
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

export default async function VendasPage() {
  const supabase = await createClient();
  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_date, payment_method, gross_revenue, net_profit")
    .order("sale_date", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Histórico das suas vendas registradas.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vendas/nova">Registrar venda</Link>
        </Button>
      </div>

      {sales && sales.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Faturamento</TableHead>
              <TableHead>Lucro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-muted-foreground">
                  {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(Number(sale.gross_revenue))}</TableCell>
                <TableCell className="tabular-nums text-success">
                  {formatCurrency(Number(sale.net_profit))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma venda registrada ainda —{" "}
          <Link href="/dashboard/vendas/nova" className="font-medium text-primary hover:underline">
            registrar venda
          </Link>
          .
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Criar `app/dashboard/vendas/nova/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { SaleForm } from "@/components/vendas/sale-form";

export default async function NovaVendaPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, current_price")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Registrar venda</h1>
      </div>
      <SaleForm
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          currentPrice: p.current_price !== null ? Number(p.current_price) : 0,
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/sales.ts components/vendas app/dashboard/vendas
git commit -m "feat(vendas): registro de venda via função atômica register_sale"
```

---

## Task 12: Teste de integração — `register_sale`

**Files:**
- Test: `tests/integration/register-sale.test.ts`

**Interfaces:**
- Consumes: função `register_sale` (Task 2), diretamente via `@supabase/supabase-js` (mesmo
  padrão de `tests/integration/rls-isolation.test.ts`).
- Produces: garantia automatizada de que a venda decrementa o estoque corretamente, calcula o
  lucro certo, rejeita estoque insuficiente sem alterar dados, e impede uso de produto de
  outro tenant (seções 7 e 14 da spec principal).

- [ ] **Step 1: Escrever o teste**

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

describe("register_sale (função Postgres)", () => {
  const userEmail = `register-sale-${Date.now()}@faturio-test.com`;
  const otherUserEmail = `register-sale-other-${Date.now()}@faturio-test.com`;
  const password = "senha-teste-12345";

  let userId: string;
  let otherUserId: string;
  let productId: string;
  let otherProductId: string;

  beforeAll(async () => {
    const user = await createTestUser(userEmail, password);
    const otherUser = await createTestUser(otherUserEmail, password);
    userId = user.id;
    otherUserId = otherUser.id;

    await admin.from("settings").insert({
      user_id: userId,
      packaging_cost: 2,
      shipping_cost: 5,
      gift_cost: 0,
      traffic_cost: 0,
      admin_fee: 0.05,
      card_fee: 0.03,
      desired_margin: 0.2,
    });
    await admin.from("settings").insert({ user_id: otherUserId });

    const { data: product } = await admin
      .from("products")
      .insert({ user_id: userId, name: "Produto Venda A", cost: 20, stock_quantity: 10 })
      .select()
      .single();
    productId = product!.id;

    const { data: otherProduct } = await admin
      .from("products")
      .insert({ user_id: otherUserId, name: "Produto Venda B", cost: 10, stock_quantity: 10 })
      .select()
      .single();
    otherProductId = otherProduct!.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
    await admin.auth.admin.deleteUser(otherUserId);
  });

  it("registra a venda, decrementa o estoque e calcula o lucro corretamente", async () => {
    const client = await signInAs(userEmail, password);
    const { data: saleId, error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 3, unit_price: 50 }],
      p_payment_method: "pix",
      p_discount: 0,
    });

    expect(error).toBeNull();
    expect(saleId).toBeTruthy();

    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();
    expect(product!.stock_quantity).toBe(7);

    const { data: saleItems } = await admin.from("sale_items").select().eq("sale_id", saleId);
    expect(saleItems).toHaveLength(1);
    expect(Number(saleItems![0].profit)).toBeCloseTo(3 * (50 - 20), 2);

    const { data: movements } = await admin
      .from("inventory_movements")
      .select()
      .eq("product_id", productId)
      .eq("type", "sale");
    expect(movements).toHaveLength(1);
    expect(movements![0].quantity).toBe(-3);
  });

  it("rejeita a venda quando o estoque é insuficiente e não altera o estoque", async () => {
    const client = await signInAs(userEmail, password);
    const { error } = await client.rpc("register_sale", {
      p_items: [{ product_id: productId, quantity: 1000, unit_price: 50 }],
      p_payment_method: "pix",
      p_discount: 0,
    });

    expect(error).not.toBeNull();

    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();
    expect(product!.stock_quantity).toBe(7);
  });

  it("impede registrar venda usando produto de outro usuário", async () => {
    const client = await signInAs(userEmail, password);
    const { error } = await client.rpc("register_sale", {
      p_items: [{ product_id: otherProductId, quantity: 1, unit_price: 50 }],
      p_payment_method: "pix",
      p_discount: 0,
    });

    expect(error).not.toBeNull();

    const { data: product } = await admin
      .from("products")
      .select("stock_quantity")
      .eq("id", otherProductId)
      .single();
    expect(product!.stock_quantity).toBe(10);
  });
});
```

Salve como `tests/integration/register-sale.test.ts`. Os três testes rodam em sequência e o
segundo/terceiro dependem do estoque final do primeiro (7 unidades) — mesmo padrão sequencial
já usado em `tests/integration/webhook-idempotency.test.ts`.

- [ ] **Step 2: Rodar e confirmar que passa**

```bash
set -a && source .env.local && set +a
npm run test:integration
```

Expected: `3 passed` neste arquivo (mais os testes já existentes de isolamento RLS e
idempotência do webhook).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/register-sale.test.ts
git commit -m "test: garante atomicidade, estoque e isolamento de register_sale"
```

---

## Task 13: Metas

**Files:**
- Create: `lib/actions/goals.ts`
- Create: `components/metas/goal-form.tsx`
- Create: `app/dashboard/metas/page.tsx`

**Interfaces:**
- Produces: `upsertGoal(input): Promise<GoalActionResult>`.

- [ ] **Step 1: Criar `lib/actions/goals.ts`**

```typescript
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const goalSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  revenueGoal: z.number().min(0, "Informe uma meta válida"),
  desiredMargin: z.number().min(0).max(0.9999).optional(),
});

export interface GoalActionResult {
  success: boolean;
  error?: string;
}

export async function upsertGoal(input: z.infer<typeof goalSchema>): Promise<GoalActionResult> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("month", parsed.data.month)
    .eq("year", parsed.data.year)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("goals")
      .update({
        revenue_goal: parsed.data.revenueGoal,
        desired_margin: parsed.data.desiredMargin ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      return { success: false, error: "Não foi possível salvar a meta. Tente novamente." };
    }
    return { success: true };
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    month: parsed.data.month,
    year: parsed.data.year,
    revenue_goal: parsed.data.revenueGoal,
    desired_margin: parsed.data.desiredMargin ?? null,
  });

  if (error) {
    return { success: false, error: "Não foi possível criar a meta. Tente novamente." };
  }

  return { success: true };
}
```

- [ ] **Step 2: Criar `components/metas/goal-form.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upsertGoal } from "@/lib/actions/goals";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  revenueGoal: z.number().min(0, "Informe uma meta válida"),
  desiredMargin: z.number().min(0).max(0.9999).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function GoalForm({
  defaultMonth,
  defaultYear,
}: {
  defaultMonth: number;
  defaultYear: number;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { month: defaultMonth, year: defaultYear },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccess(false);
    const result = await upsertGoal(values);
    if (!result.success) {
      setServerError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
          <div className="w-24">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mês</label>
            <Input type="number" step="1" min={1} max={12} {...register("month", { valueAsNumber: true })} />
          </div>
          <div className="w-28">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Ano</label>
            <Input type="number" step="1" {...register("year", { valueAsNumber: true })} />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Meta (R$)</label>
            <Input
              type="number"
              step="0.01"
              invalid={!!errors.revenueGoal}
              {...register("revenueGoal", { valueAsNumber: true })}
            />
          </div>
          <div className="w-44">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Margem desejada</label>
            <Input type="number" step="0.0001" {...register("desiredMargin", { valueAsNumber: true })} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar meta"}
          </Button>
          {errors.revenueGoal && (
            <p className="basis-full text-sm text-destructive">{errors.revenueGoal.message}</p>
          )}
          {serverError && (
            <div className="basis-full">
              <Alert variant="destructive">{serverError}</Alert>
            </div>
          )}
          {success && (
            <div className="basis-full">
              <Alert>Meta salva com sucesso.</Alert>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Criar `app/dashboard/metas/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { GoalForm } from "@/components/metas/goal-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function MetasPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("goals")
    .select("id, month, year, revenue_goal, desired_margin")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Metas</h1>
        <p className="text-muted-foreground">Defina sua meta de faturamento mês a mês.</p>
      </div>

      <GoalForm defaultMonth={now.getMonth() + 1} defaultYear={now.getFullYear()} />

      {goals && goals.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Meta</TableHead>
              <TableHead>Margem desejada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.map((goal) => (
              <TableRow key={goal.id}>
                <TableCell>
                  {monthNames[goal.month - 1]} de {goal.year}
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(Number(goal.revenue_goal))}</TableCell>
                <TableCell className="tabular-nums">
                  {goal.desired_margin !== null ? `${(Number(goal.desired_margin) * 100).toFixed(1)}%` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/goals.ts components/metas app/dashboard/metas
git commit -m "feat(metas): criação e edição de meta mensal"
```

---

## Task 14: Gráfico de faturamento (Recharts)

**Files:**
- Modify: `package.json` (dependência `recharts`)
- Create: `components/dashboard/revenue-chart.tsx`

**Interfaces:**
- Produces: `RevenueChart`, tipo `RevenueChartPoint` — consumido pela Task 15.

- [ ] **Step 1: Instalar Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Criar `components/dashboard/revenue-chart.tsx`**

```typescript
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

export function RevenueChart({ data }: { data: RevenueChartPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip
            formatter={(value: number) =>
              value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            }
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "10px",
            }}
          />
          <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o projeto compila**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/dashboard/revenue-chart.tsx
git commit -m "feat(dashboard): componente de gráfico de faturamento (Recharts)"
```

---

## Task 15: Dashboard — Visão geral

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `calculateGoalProgress` (Plano 1), `calculateStockPotential` (Plano 1),
  `calculateAverageTicket`/`calculateMonthProjection` (Task 3), `RevenueChart` (Task 14),
  `Card`, `Progress`.
- Produces: substitui o placeholder de `/dashboard` pelo dashboard real descrito na seção 10
  da spec principal.

- [ ] **Step 1: Substituir `app/dashboard/page.tsx`**

```typescript
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { calculateGoalProgress } from "@/lib/finance/goals";
import { calculateStockPotential } from "@/lib/finance/stock-potential";
import { calculateAverageTicket, calculateMonthProjection } from "@/lib/finance/projection";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, now.getMonth(), 1).toISOString();
  const startOfNextMonth = new Date(year, now.getMonth() + 1, 1).toISOString();

  const [{ data: goal }, { data: sales }, { data: products }] = await Promise.all([
    supabase.from("goals").select("revenue_goal").eq("month", month).eq("year", year).maybeSingle(),
    supabase
      .from("sales")
      .select("id, sale_date, gross_revenue, net_profit, sale_items(quantity)")
      .gte("sale_date", startOfMonth)
      .lt("sale_date", startOfNextMonth)
      .order("sale_date", { ascending: true }),
    supabase
      .from("products")
      .select("stock_quantity, minimum_stock, current_price")
      .eq("status", "active"),
  ]);

  const salesList = sales ?? [];
  const productsList = products ?? [];

  const totalRevenue = salesList.reduce((sum, sale) => sum + Number(sale.gross_revenue), 0);
  const totalProfit = salesList.reduce((sum, sale) => sum + Number(sale.net_profit), 0);
  const totalPiecesSold = salesList.reduce(
    (sum, sale) =>
      sum + sale.sale_items.reduce((itemSum: number, item: { quantity: number }) => itemSum + item.quantity, 0),
    0
  );
  const margin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const averageTicket = calculateAverageTicket(totalRevenue, salesList.length);

  const goalProgress = calculateGoalProgress({
    goal: goal?.revenue_goal ?? 0,
    currentRevenue: totalRevenue,
    averageTicket,
  });

  const stockPotential = calculateStockPotential(
    productsList.map((p) => ({
      stockQuantity: p.stock_quantity,
      currentPrice: Number(p.current_price ?? 0),
    }))
  );
  const totalStockUnits = productsList.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStockCount = productsList.filter((p) => p.stock_quantity < p.minimum_stock).length;

  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthProjection = calculateMonthProjection(totalRevenue, now.getDate(), daysInMonth);

  const revenueByDay = new Map<string, number>();
  for (const sale of salesList) {
    const day = String(sale.sale_date).slice(0, 10);
    revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + Number(sale.gross_revenue));
  }
  const chartData = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({ date, revenue }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão geral</h1>
        <p className="text-muted-foreground">Bem-vindo, {user?.email}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Meta mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(goal?.revenue_goal ?? 0)}
            </p>
            <div className="mt-3">
              <Progress value={goalProgress.progressPercentage * 100} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {(goalProgress.progressPercentage * 100).toFixed(1)}% — falta{" "}
                {formatCurrency(goalProgress.remaining)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(totalProfit)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{(margin * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Peças vendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalPiecesSold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(averageTicket)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">{totalStockUnits} un.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(stockPotential)} em potencial
              {lowStockCount > 0 && ` · ${lowStockCount} produto(s) com estoque baixo`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Falta para a meta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(goalProgress.remaining)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ~{goalProgress.estimatedSalesNeeded} vendas para bater a meta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Projeção mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(monthProjection)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Faturamento no mês</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <RevenueChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada neste mês ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que o projeto compila e builda**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): visão geral com cards e gráfico de faturamento"
```

---

## Task 16: Verificação final ponta a ponta

**Files:**
- Nenhum arquivo novo — apenas verificação manual e automatizada do fluxo completo.

**Interfaces:**
- Consumes: todas as tasks anteriores deste plano.

- [ ] **Step 1: Rodar toda a suíte de testes**

```bash
set -a && source .env.local && set +a
npm run test && npm run test:integration
```

Expected: todos os testes passando (sanidade, precificação, meta, estoque potencial,
projeção/ticket médio, isolamento multi-tenant, idempotência do webhook, `register_sale`).

- [ ] **Step 2: Verificar build de produção**

Run: `npx tsc --noEmit && npm run build`
Expected: build concluído sem erros, todas as rotas novas listadas no output.

- [ ] **Step 3: QA manual do fluxo completo**

```bash
npm run dev -- --port 3100 &
timeout 30 bash -c 'until curl -sf http://localhost:3100 >/dev/null; do sleep 1; done'
```

Com um usuário de teste que já passou pelo checkout (ou criado via
`supabase.auth.admin.createUser` + linha em `subscriptions` com `status='active'`), confirme
manualmente pelo navegador:
1. Login redireciona para `/onboarding` (settings ainda sem `onboarding_completed`).
2. Preencher as 8 perguntas e concluir redireciona para `/dashboard`, que mostra os cards
   zerados e a meta criada.
3. Cadastrar um produto em `/dashboard/produtos/novo` com estoque inicial — aparece em
   `/dashboard/estoque`.
4. Registrar uma venda em `/dashboard/vendas/nova` — estoque do produto diminui, venda aparece
   em `/dashboard/vendas`, e os cards de `/dashboard` (faturamento, lucro, peças vendidas,
   ticket médio, falta para meta) refletem a venda.
5. Editar configurações em `/dashboard/configuracoes` e confirmar que persiste.

- [ ] **Step 4: Screenshot das páginas principais**

```bash
node scripts/screenshot.mjs http://localhost:3100/dashboard screenshots/plano4-dashboard.png light
node scripts/screenshot.mjs http://localhost:3100/dashboard/produtos screenshots/plano4-produtos.png light
node scripts/screenshot.mjs http://localhost:3100/dashboard/vendas screenshots/plano4-vendas.png light
lsof -ti:3100 -sTCP:LISTEN | xargs -r kill
```

- [ ] **Step 5: Corrigir a referência desatualizada em CLAUDE.md/AGENTS.md, se aplicável**

Confirme que nenhum texto do produto ainda menciona "implementado no Plano 3" para o
dashboard (o placeholder antigo foi substituído na Task 15). Não há mudança de arquivo
necessária se a Task 15 já substituiu o texto por completo.

- [ ] **Step 6: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: verificação final do Plano 4 — motor de negócio completo"
```

Se não houver mudanças pendentes (todas as tasks já commitadas individualmente), pule este
commit.
