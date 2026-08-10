# Faturio — Design / Spec

Data: 2026-08-10
Status: Aprovado para planejamento de implementação

## 1. Visão geral

Faturio é um SaaS multi-tenant de precificação, controle de estoque, registro de vendas,
análise de lucro e acompanhamento de meta de faturamento, vendido por **R$ 129,90 (pagamento
único, acesso vitalício)**.

Dois ambientes:

- **Área pública**: landing page comercial (apresentação, funcionalidades, preço, FAQ,
  checkout).
- **Área privada**: dashboard exclusiva por cliente (produtos, estoque, vendas, metas,
  custos, financeiro, marketing, relatórios).

Regra absoluta do produto: **isolamento total de dados entre clientes**, garantido em banco
(RLS), não apenas na UI.

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript + React 19 | Mesmo padrão já validado em produção no `scootergestor` (outro SaaS multi-tenant do mesmo cliente) |
| Estilo/UI | Tailwind CSS 4 + shadcn/ui (radix-ui) | Consistência com os demais projetos, componentes acessíveis por padrão |
| Banco/Auth | Supabase (Postgres + Auth + RLS) | RLS nativo no Postgres é a base do isolamento multi-tenant; Auth integrado |
| Pagamento | Mercado Pago (Checkout Pro) | Líder no Brasil, Pix + cartão + boleto nativos, checkout hospedado (reduz escopo de PCI compliance), webhooks maduros, sem mensalidade |
| E-mail transacional | Resend | Boa integração com Next.js/Vercel, API simples |
| Validação | Zod + react-hook-form | Validação client+server compartilhada |
| Gráficos | Recharts | Já usado no `scootergestor`, boa qualidade visual |
| Animações | Framer Motion | Microinterações sutis na landing e dashboard |
| Testes | Vitest (unit + integração) | Rápido, nativo em TS/ESM, roda bem com Next 16 |
| Deploy | Vercel | Padrão dos demais projetos Next.js do cliente |

## 3. Arquitetura multi-tenant

Multi-tenancy por **linha** (shared schema, row-level isolation): uma única base Postgres;
toda tabela de dado do cliente carrega `user_id` referenciando `auth.users(id)`.

Camadas de proteção (defesa em profundidade):

1. **RLS no Postgres** — cada tabela de tenant tem RLS habilitada com política:
   ```sql
   USING (user_id = auth.uid())
   WITH CHECK (user_id = auth.uid())
   ```
   Isso vale para SELECT, INSERT, UPDATE e DELETE. Nenhuma tabela de tenant fica com RLS
   desabilitada ou com política `USING (true)`.

2. **Identidade sempre do servidor** — nenhuma Server Action ou Route Handler aceita
   `user_id` do client. O `user_id` usado em toda escrita é sempre o resultado de
   `supabase.auth.getUser()` no servidor, nunca um valor do payload da requisição. Um
   `user_id` enviado pelo client é ignorado (a Server Action nem declara esse campo como
   input aceito).

3. **`service_role` isolado e auditável** — a chave que ignora RLS só é usada em dois
   lugares, ambos server-only, nunca expostos ao client:
   - o handler do webhook do Mercado Pago (precisa criar o `auth.users` do cliente antes de
     ele ter sessão);
   - a futura área administrativa (seção 11).

4. **Teste automatizado de isolamento** (crítico, seção 40.6) — não é apenas verificado
   manualmente: existe um teste de integração que autentica dois usuários reais (`User A`,
   `User B`), cria um produto para cada um, e verifica que a tentativa de `User A` ler/editar/
   excluir o produto de `User B` é negada **pelo banco** (RLS), não pela UI.

## 4. Banco de dados

Todas as tabelas abaixo (exceto `profiles`) têm `user_id uuid not null references auth.users(id)`
e RLS conforme a seção 3.

### `profiles`
```
id            uuid primary key references auth.users(id)
name          text not null
email         text not null
role          text not null default 'user'  -- 'user' | 'admin'
created_at    timestamptz not null default now()
```

### `subscriptions`
```
id                      uuid primary key default gen_random_uuid()
user_id                 uuid not null references auth.users(id)
status                  text not null  -- 'pending' | 'active' | 'expired' | 'cancelled' | 'blocked'
mercadopago_payment_id  text unique    -- ancora de idempotência
amount                  numeric(10,2) not null default 129.90
started_at              timestamptz
created_at              timestamptz not null default now()
```

### `pending_checkouts`
```
id                      uuid primary key default gen_random_uuid()  -- usado como external_reference no MP
name                    text not null
email                   text not null
status                  text not null default 'pending'  -- 'pending' | 'completed' | 'failed'
mercadopago_payment_id  text
created_at              timestamptz not null default now()
```
Tabela não pertence a um `user_id` (o usuário ainda não existe nesse ponto do fluxo); acesso
restrito a service role.

### `products`
```
id                uuid primary key default gen_random_uuid()
user_id           uuid not null references auth.users(id)
name              text not null
sku               text
category          text
supplier          text
cost              numeric(10,2) not null check (cost >= 0)
entry_shipping    numeric(10,2) not null default 0 check (entry_shipping >= 0)
current_price     numeric(10,2) check (current_price >= 0)
desired_margin    numeric(5,4) check (desired_margin >= 0 and desired_margin < 1)
stock_quantity    integer not null default 0 check (stock_quantity >= 0)
minimum_stock     integer not null default 0 check (minimum_stock >= 0)
status            text not null default 'active'
created_at        timestamptz not null default now()
updated_at        timestamptz not null default now()
```

### `sales`
```
id                uuid primary key default gen_random_uuid()
user_id           uuid not null references auth.users(id)
sale_date         timestamptz not null default now()
payment_method    text not null
discount          numeric(10,2) not null default 0 check (discount >= 0)
gross_revenue     numeric(10,2) not null check (gross_revenue >= 0)
fees              numeric(10,2) not null default 0
shipping_cost     numeric(10,2) not null default 0
packaging_cost    numeric(10,2) not null default 0
gift_cost         numeric(10,2) not null default 0
traffic_cost      numeric(10,2) not null default 0
net_profit        numeric(10,2) not null
created_at        timestamptz not null default now()
```

### `sale_items`
```
id            uuid primary key default gen_random_uuid()
user_id       uuid not null references auth.users(id)
sale_id       uuid not null references sales(id) on delete cascade
product_id    uuid not null references products(id)
quantity      integer not null check (quantity > 0)
unit_price    numeric(10,2) not null check (unit_price >= 0)
unit_cost     numeric(10,2) not null check (unit_cost >= 0)
subtotal      numeric(10,2) not null
profit        numeric(10,2) not null
```
Regra de aplicação (validada na Server Action, não só no banco): `product_id` referenciado
precisa pertencer ao mesmo `user_id` da venda — checagem explícita antes do insert, além da
RLS.

### `inventory_movements`
```
id            uuid primary key default gen_random_uuid()
user_id       uuid not null references auth.users(id)
product_id    uuid not null references products(id)
type          text not null  -- 'initial' | 'entry' | 'sale' | 'adjustment' | 'return'
quantity      integer not null
unit_cost     numeric(10,2)
reason        text
created_at    timestamptz not null default now()
```

### `goals`
```
id                uuid primary key default gen_random_uuid()
user_id           uuid not null references auth.users(id)
month             integer not null check (month between 1 and 12)
year              integer not null
revenue_goal      numeric(10,2) not null check (revenue_goal >= 0)
desired_margin    numeric(5,4) check (desired_margin >= 0 and desired_margin < 1)
created_at        timestamptz not null default now()
unique (user_id, month, year)
```

### `marketing_expenses`
```
id            uuid primary key default gen_random_uuid()
user_id       uuid not null references auth.users(id)
date          date not null
platform      text not null  -- 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'other'
campaign      text
amount        numeric(10,2) not null check (amount >= 0)
sales         integer not null default 0 check (sales >= 0)
revenue       numeric(10,2) not null default 0 check (revenue >= 0)
created_at    timestamptz not null default now()
```

### `settings`
```
id                uuid primary key default gen_random_uuid()
user_id           uuid not null unique references auth.users(id)
packaging_cost    numeric(10,2) not null default 0
gift_cost         numeric(10,2) not null default 0
shipping_cost     numeric(10,2) not null default 0
admin_fee         numeric(5,4) not null default 0 check (admin_fee >= 0 and admin_fee < 1)
card_fee          numeric(5,4) not null default 0 check (card_fee >= 0 and card_fee < 1)
traffic_cost      numeric(10,2) not null default 0
desired_margin    numeric(5,4) not null default 0 check (desired_margin >= 0 and desired_margin < 1)
```

Constraint adicional em `settings` a nível de aplicação: `admin_fee + card_fee + desired_margin < 1`
(regra de precificação da seção 6).

## 5. Fluxo de compra e ativação de conta

```
Landing page
  → botão "Começar agora — R$ 129,90"
  → /checkout (formulário: nome, e-mail)
  → Server Action cria registro em pending_checkouts (status=pending)
    e cria uma Preference no Mercado Pago (external_reference = pending_checkouts.id)
  → redirect para o Checkout Pro hospedado do Mercado Pago
  → cliente paga (Pix ou cartão)
  → Mercado Pago redireciona para /pagamento/sucesso | /pendente | /recusado
    (feedback visual apenas — NÃO libera acesso)

Em paralelo, de forma assíncrona:
  → Mercado Pago envia webhook para /api/webhooks/mercadopago
  → handler:
     1. valida assinatura do webhook (x-signature)
     2. busca o pagamento na API do Mercado Pago pelo payment_id recebido
        (nunca confia em valores do corpo da notificação)
     3. localiza pending_checkouts pelo external_reference
     4. verifica idempotência: UNIQUE(mercadopago_payment_id) em subscriptions
        — se já processado, responde 200 sem reprocessar
     5. se status = approved:
        - cria o usuário via supabase.auth.admin.inviteUserByEmail(email)
          (o e-mail de convite cobre "boas-vindas" + "defina sua senha")
        - cria profiles (role='user')
        - cria subscriptions (status='active', mercadopago_payment_id, started_at=now())
        - cria settings (linha default para o usuário, populada no onboarding)
        - marca pending_checkouts como 'completed'
     6. se status = rejected: marca pending_checkouts como 'failed'
     7. responde 200 rapidamente em qualquer caso de sucesso de processamento
```

Middleware do Next.js protege `/dashboard/**`: exige sessão válida **e**
`subscriptions.status = 'active'` para o usuário, revalidado no servidor a cada request (sem
depender de estado em cache do client). Server Actions da área privada repetem essa checagem
antes de qualquer leitura/escrita (defesa em profundidade — nunca confiar só na página de
sucesso nem só no middleware).

### Páginas de status de pagamento
- `/pagamento/sucesso`: "Pagamento confirmado! Seu acesso foi liberado." + botão "Acessar
  minha dashboard" (login, já que a conta é criada via convite por e-mail).
- `/pagamento/pendente`: "Estamos aguardando a confirmação do pagamento." + status.
- `/pagamento/recusado`: "Não foi possível concluir seu pagamento." + botão "Tentar
  novamente".

### Login
`/login` com e-mail/senha, "Esqueci minha senha" (fluxo nativo do Supabase Auth) e link para
o checkout ("Não possui uma conta? Comece agora.").

## 6. Fórmulas financeiras

**Preço de venda recomendado:**
```
Preço = C / (1 - T - M)
```
- `C` = custos fixos por unidade (embalagem + frete + brinde + custo do produto)
- `T` = soma das taxas percentuais (taxa administrativa + taxa de cartão)
- `M` = margem líquida desejada

Validação: `T + M < 1`, senão erro "Configuração de custos inválida — a soma de taxas e
margem não pode atingir 100%." Implementado como função pura testável em
`lib/finance/pricing.ts`.

**Quanto falta para a meta:**
```
falta = max(meta - faturamento_atual, 0)
vendas_estimadas = ceil(falta / ticket_médio)
```

**Potencial de faturamento do estoque:**
```
potencial = Σ (stock_quantity_produto × current_price_produto)
```
Comparado com a meta: "Seu estoque possui potencial suficiente para atingir a meta" quando
`potencial >= meta`.

Todas as fórmulas vivem em `lib/finance/*.ts` como funções puras (sem I/O), testadas
isoladamente com Vitest e reaproveitadas tanto no dashboard quanto nos relatórios.

## 7. Estoque e vendas

- Estoque nunca fica negativo: `CHECK (stock_quantity >= 0)` no banco + validação na Server
  Action antes de confirmar a baixa (evita erro genérico de constraint chegar até a UI).
- Toda venda gera: 1 linha em `sales`, N linhas em `sale_items`, N movimentos em
  `inventory_movements` (`type='sale'`), e decrementa `products.stock_quantity` — tudo em uma
  única transação no banco (ou tudo aplica, ou nada aplica).
- `sale_items.product_id` é validado como pertencente ao mesmo `user_id` da venda antes do
  insert (checagem explícita, além da RLS).

## 8. Onboarding

Após o primeiro login (senha definida via convite), fluxo de 8 perguntas conforme o
prompt original (meta mensal, margem desejada, custo de embalagem, frete médio, custo de
brinde, taxa administrativa, taxa de cartão, custo médio de tráfego por venda) grava direto
em `settings` e cria o primeiro registro em `goals` para o mês corrente. Tela final: "Tudo
pronto! Seu painel está configurado." → dashboard.

## 9. Landing page

Estrutura e copy seguem integralmente o conteúdo já definido no prompt original do cliente
(hero, seção de problema, solução, funcionalidades, como funciona, demonstração visual,
benefícios, preço, confiança, FAQ). Sem depoimentos ou números inventados — estrutura
preparada para inserir depoimentos reais depois. Mobile-first, com Framer Motion para
fade-in/slide-up/hover discretos, FAQ em accordion, SEO completo (title, meta description,
Open Graph, favicon, heading hierarchy). Domínio ainda não definido — meta tags usam
placeholder a ser substituído quando o domínio for registrado.

## 10. Dashboard

Cards: meta mensal, faturamento, lucro líquido, margem, peças vendidas, estoque, ticket
médio, falta para meta, projeção mensal — todos filtrados implicitamente por RLS (nenhuma
query de dashboard precisa de `WHERE user_id = ...` manual, mas as Server Actions incluem de
qualquer forma como defesa em profundidade). Visual: cards limpos, tipografia elegante,
Recharts para gráficos, espaçamento generoso, transições suaves via Framer Motion.

## 11. Administração (preparado, não construído agora)

`profiles.role` (`user`/`admin`) já modelado. Nenhuma UI de admin nesta primeira entrega —
apenas a estrutura de dados e a separação de responsabilidade (rotas de admin, se
construídas depois, vivem fora de `/dashboard` e usam `service_role` de forma isolada,
nunca misturadas com as Server Actions do cliente comum).

## 12. E-mails transacionais (Resend)

- **Funcional nesta entrega**: convite de acesso pós-pagamento (`inviteUserByEmail`, cobre
  "confirmação de pagamento" + "boas-vindas" em um único e-mail); recuperação de senha (fluxo
  nativo do Supabase Auth).
- **Estrutura preparada, não disparada nesta entrega** (sem gatilho ainda definido): aviso de
  acesso bloqueado/cancelado. E-mail de "vencimento" não se aplica (acesso é vitalício).
  Funções ficam stubadas em `lib/email/` com TODO explícito.

## 13. LGPD

Páginas de Política de Privacidade e Termos de Uso com estrutura inicial (dados coletados,
finalidade, isolamento entre clientes, direitos do titular, possibilidade de exclusão de
conta). Texto claramente marcado como **modelo inicial, não aconselhamento jurídico** —
requer revisão profissional antes de publicação. Exclusão de conta: fluxo de solicitação
(via e-mail de suporte nesta primeira versão; self-service pode vir depois).

## 14. Testes

- **Unitários (Vitest)**: fórmulas de precificação, cálculo de meta, potencial de estoque,
  validações financeiras (margem/taxa não podem passar de 100%, valores negativos rejeitados).
- **Integração — isolamento multi-tenant**: dois usuários reais autenticados, produto de A
  não pode ser lido/editado/excluído por B e vice-versa; verificado contra o Postgres/RLS
  real, não mockado.
- **Integração — webhook idempotente**: mesmo `mercadopago_payment_id` processado duas vezes
  não duplica `subscriptions` nem reenvia convite.
- **Estoque**: entrada + venda + devolução resultam no saldo correto; venda que zeraria/
  negativaria o estoque é rejeitada.
- **Vendas**: registrar venda calcula lucro corretamente e atualiza estoque/meta/
  faturamento na mesma transação.

## 15. Fora de escopo desta entrega (mencionado no prompt como "futuro")

- UI de administração.
- Envio de e-mails de aviso de vencimento (não aplicável a acesso vitalício).
- Emissão de nota fiscal.
- Domínio definitivo (placeholder usado até o cliente registrar um).

## 16. Estrutura do projeto

Novo diretório `/home/richard/www/projetos/faturio`, git próprio (inicializado), seguindo o
padrão dos demais projetos do cliente (`CLAUDE.md`, `AGENTS.md`, `README.md`, `docs/`,
`supabase/migrations`).
