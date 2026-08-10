# Faturio — Plano 4: Motor de Negócio (Onboarding, Produtos, Estoque, Vendas, Metas, Dashboard)

Data: 2026-08-10
Status: Aprovado para planejamento de implementação

## 1. Escopo

Este plano cobre o **motor de negócio funcional do Faturio**: tudo que faz o produto
efetivamente fazer o que promete vender (seções 6, 7, 8 e 10 da spec principal,
`docs/superpowers/specs/2026-08-10-faturio-design.md`). É o trabalho reservado pelo Plano 3
como "Plano 4" — dashboard, produtos, estoque, vendas, metas, onboarding, sidebar/topbar do
app logado.

**Dentro do escopo:**
- Onboarding pós-pagamento (8 perguntas), obrigatório antes de acessar o dashboard.
- Layout autenticado com sidebar (`/dashboard/**`).
- CRUD de produtos, com cálculo de preço sugerido.
- Gestão de estoque (movimentações: entrada, ajuste, devolução).
- Registro de vendas (transação atômica: venda + itens + baixa de estoque).
- CRUD de metas mensais.
- Página de configurações (edição pós-onboarding dos mesmos campos).
- Dashboard (visão geral) com cards e um gráfico de evolução de faturamento.

**Fora do escopo (fica para depois, schema já existe):**
- `marketing_expenses` — tabela existe no schema, mas a seção 10 da spec principal não lista
  nenhum card/tela de marketing; fica preparado sem UI, mesmo tratamento dado à administração
  (seção 11 da spec principal).
- UI de administração (`profiles.role = 'admin'`).
- Toggle de tema (dark mode já existe nos tokens, sem seletor manual).
- Notificações, relatórios avançados, insights.

Corrige também uma referência desatualizada: o placeholder atual de `app/dashboard/page.tsx`
diz "implementado no Plano 3" — era o Plano 3 antigo (antes de o design system virar sua
própria entrega); o texto correto é "Plano 4", este documento.

## 2. Arquitetura de mutação

**Server Actions por domínio**, em `lib/actions/{products,stock,sales,goals,settings,onboarding}.ts`,
usando `lib/supabase/server.ts` (cliente que respeita RLS e lê `user_id` de
`supabase.auth.getUser()` no servidor — nunca do client, regra crítica do AGENTS.md). Mesmo
padrão já usado em `lib/actions/checkout.ts`. Formulários como Client Components com
`react-hook-form` + `zod`, igual ao `/login` redesenhado.

Rejeitada: Route Handlers/API REST — divergiria do padrão já estabelecido no projeto sem
nenhum consumidor externo que justifique a serialização extra.

## 3. Navegação autenticada

`app/dashboard/layout.tsx` novo — sidebar fixa (ícones Lucide + labels): Visão geral,
Produtos, Estoque, Vendas, Metas, Configurações. Colapsa em menu hamburguer no mobile, mesmo
padrão da navbar da landing (Client Component, `useState` de aberto/fechado). Cada seção é
uma rota própria:

```
app/dashboard/
  layout.tsx              — sidebar + guarda de sessão (dado já garantido pelo middleware)
  page.tsx                — visão geral (substitui o placeholder atual)
  produtos/page.tsx
  estoque/page.tsx
  vendas/page.tsx
  metas/page.tsx
  configuracoes/page.tsx
app/onboarding/page.tsx   — fora de /dashboard, fluxo próprio de 8 passos
```

## 4. Migration necessária

Uma nova migration `supabase/migrations/20260810000002_onboarding_gate.sql`:

```sql
alter table public.settings
  add column onboarding_completed boolean not null default false;
```

Necessária porque `settings` já é criada (vazia, com defaults) no webhook de pagamento
(`processPayment`, Plano 1) — não dá para usar "linha existe ou não" como sinal de onboarding
concluído, precisa de uma coluna explícita.

## 5. Onboarding (`/onboarding`)

Formulário multi-step (8 perguntas da seção 8 da spec principal: meta mensal, margem
desejada, custo de embalagem, frete médio, custo de brinde, taxa administrativa, taxa de
cartão, custo médio de tráfego por venda). Client Component, um passo por vez, sem salvar
parcial no banco (só ao final, para não deixar `settings` em estado intermediário
inconsistente). Ao concluir:
- Server Action `completeOnboarding` faz `update` em `settings` (linha já existe) com os 7
  valores numéricos + `onboarding_completed = true`.
- Cria o primeiro registro em `goals` para `(month, year)` correntes com a meta informada.
- Tela final: "Tudo pronto! Seu painel está configurado." → redireciona para `/dashboard`.

**Gate no middleware:** `middleware.ts` (Plano 1) ganha uma checagem adicional depois da de
assinatura ativa — se `settings.onboarding_completed = false`, redireciona para `/onboarding`
em vez de deixar acessar `/dashboard/**`. `/onboarding` em si fica fora do matcher do
middleware atual (roda sua própria checagem de sessão, sem checagem de onboarding — evita
loop de redirecionamento).

## 6. Produtos (`/dashboard/produtos`)

- Lista (tabela) com nome, categoria, custo, preço atual, estoque, status.
- Formulário criar/editar: nome, sku, categoria, fornecedor, custo, frete de entrada, margem
  desejada, estoque inicial (só no create), estoque mínimo.
- Preço sugerido calculado em tempo real no formulário via `calculateRecommendedPrice`
  (`lib/finance/pricing.ts`, já existe), usando `cost + entry_shipping` como custo fixo e as
  taxas de `settings` (embalagem, frete, admin, cartão) somadas à margem desejada do produto.
  Usuário pode aceitar a sugestão (preenche `current_price`) ou digitar outro valor.
- Ao criar produto com estoque inicial > 0, a Server Action grava também um
  `inventory_movements` (`type='initial'`, `quantity=<estoque inicial>`), consistente com o
  enum já definido no schema.
- Excluir produto: soft delete via `status='inactive'` (não hard delete — preserva
  histórico de `sale_items`/`inventory_movements` que referenciam o produto).

## 7. Estoque (`/dashboard/estoque`)

- Lista de produtos ativos com quantidade atual; produtos com `stock_quantity <
  minimum_stock` recebem destaque visual (mesmo padrão do `StockShowcase` da landing — ícone
  `AlertTriangle`, cor `warning`).
- Ação "Registrar movimento" por produto: tipo (`entry`/`adjustment`/`return`), quantidade,
  custo unitário (opcional, relevante para `entry`), motivo (texto livre). Server Action
  grava o `inventory_movements` e atualiza `products.stock_quantity` no mesmo `update`
  (delta aplicado no servidor, não recebido pronto do client, para evitar corrida de estado).
  `adjustment`/`return` negativos são bloqueados de derrubar o estoque abaixo de zero (mesma
  regra da venda).

## 8. Vendas (`/dashboard/vendas`)

Decisão técnica central deste plano: registrar uma venda precisa inserir em `sales` + N
`sale_items` + N `inventory_movements` (`type='sale'`) + decrementar `products.stock_quantity`
**atomicamente** — tudo aplica ou nada aplica (regra da seção 7 da spec principal). O cliente
Supabase JS/PostgREST não oferece transação multi-tabela.

**Solução:** função Postgres `register_sale(items jsonb, payment_method text, discount
numeric, sale_date timestamptz)` em nova migration
(`supabase/migrations/20260810000003_register_sale_function.sql`), `security invoker`
(mantém `auth.uid()` e RLS ativos — a função roda como o usuário chamador, não como
superusuário). Dentro da função, em uma única transação implícita:

1. Valida que todo `product_id` em `items` pertence a `auth.uid()` (defesa em profundidade,
   além da RLS).
2. Valida estoque suficiente para cada item; se algum item derrubaria o estoque abaixo de
   zero, `raise exception` com mensagem explícita (a Server Action traduz para erro amigável
   na UI, em vez do erro genérico de `CHECK constraint` chegar até o formulário).
3. Insere 1 linha em `sales` (com `gross_revenue`/`net_profit` calculados a partir dos itens
   + custos de `settings` no momento da venda).
4. Insere N linhas em `sale_items` (`unit_cost` vem de `products.cost`, `profit` calculado).
5. Insere N linhas em `inventory_movements` (`type='sale'`, quantidade negativa).
6. Decrementa `products.stock_quantity` de cada item.

Chamada via `supabase.rpc('register_sale', {...})` dentro da Server Action
`lib/actions/sales.ts`, que só faz validação Zod do input antes de repassar — a lógica de
negócio pesada fica no banco, onde a atomicidade é garantida nativamente.

**UI:** formulário de venda — adicionar produto(s) com quantidade (autocomplete/select entre
produtos ativos), forma de pagamento, desconto opcional. Custos de embalagem/frete/brinde/
tráfego vêm de `settings` como padrão, editáveis na hora se a venda específica for diferente.

## 9. Metas (`/dashboard/metas`)

CRUD simples de `goals`: lista por mês/ano, criar/editar meta de faturamento + margem
desejada do mês. `unique(user_id, month, year)` já garante que não duplica — a Server Action
trata o erro de constraint como "já existe meta para este mês" na UI.

## 10. Configurações (`/dashboard/configuracoes`)

Reaproveita o mesmo formulário do onboarding (componente compartilhado), mas como edição
direta — sem o fluxo multi-step, sem redirecionar, sem re-criar `goals`. Server Action
`updateSettings` separada de `completeOnboarding` (a primeira não mexe em
`onboarding_completed` nem em `goals`).

## 11. Dashboard — Visão geral (`/dashboard`)

Server Component busca, filtrado implicitamente por RLS (sem `WHERE user_id=` manual, mas as
Server Actions/queries incluem de qualquer forma como defesa em profundidade, conforme seção
10 da spec principal):
- `goals` do mês corrente.
- `sales` + `sale_items` do mês corrente.
- `products` ativos (para estoque).

Cards calculados a partir desses dados, usando funções já existentes em `lib/finance/`
(`calculateGoalProgress`, `calculateStockPotential`) mais duas novas:

- **Meta mensal**: valor da meta + `calculateGoalProgress` (falta / % / vendas estimadas).
- **Faturamento**: soma de `sales.gross_revenue` do mês.
- **Lucro líquido**: soma de `sales.net_profit` do mês.
- **Margem**: lucro líquido ÷ faturamento do mês.
- **Peças vendidas**: soma de `sale_items.quantity` do mês.
- **Estoque**: unidades totais + valor potencial (`calculateStockPotential`) + contagem de
  produtos abaixo do mínimo.
- **Ticket médio**: faturamento do mês ÷ número de vendas do mês (nova função
  `calculateAverageTicket(totalRevenue, salesCount)`, trivial, com teste unitário — 0 se
  `salesCount === 0`).
- **Falta para meta**: já coberto por `calculateGoalProgress`.
- **Projeção mensal**: nova função `calculateMonthProjection(currentRevenue, dayOfMonth,
  daysInMonth)` — regra de três simples (`currentRevenue / dayOfMonth * daysInMonth`), com
  teste unitário. Ambas em `lib/finance/projection.ts`.

**Gráfico:** evolução diária de faturamento no mês corrente (linha), Recharts. O Server
Component agrega `sales` por dia e passa os dados já prontos (array `{date, revenue}`) para
um Client Component (`components/dashboard/revenue-chart.tsx`) — Recharts precisa rodar no
client.

## 12. Estados

- **Loading:** botões com `isSubmitting`, mesmo padrão já usado em login/checkout.
- **Erro:** componente `Alert` (design system), incluindo o erro traduzido de
  `register_sale` (estoque insuficiente) e de `goals` (meta duplicada no mês).
- **Vazio:** listas (produtos/estoque/vendas/metas) sem dados mostram estado vazio simples
  com CTA ("Nenhum produto cadastrado ainda — Adicionar produto").

## 13. Testes

- **Unitário (Vitest):** `calculateAverageTicket`, `calculateMonthProjection` — novas
  funções, seguindo o padrão dos módulos financeiros existentes (`tests/unit/finance/`).
- **Integração:** `register_sale` testado contra o Postgres real —
  - venda com estoque suficiente decrementa corretamente e calcula lucro certo;
  - venda que zeraria/negativaria o estoque é rejeitada, estoque permanece inalterado;
  - dois `sale_items` do mesmo produto na mesma venda somam corretamente antes de validar
    estoque (não valida item a item de forma ingênua, evitando falso-positivo).
  - isolamento: usuário B não consegue registrar venda usando `product_id` de A (a função
    rejeita antes de tocar no banco).

## 14. Fora de escopo desta entrega

`marketing_expenses` (schema pronto, sem UI), administração, toggle de tema manual,
notificações, relatórios/insights avançados, exportação de dados.
