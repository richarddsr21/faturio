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
