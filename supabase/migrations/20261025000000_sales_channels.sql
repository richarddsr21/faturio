-- Canais de venda com taxas próprias (#14).
--
-- O mesmo produto custa diferente em cada canal por causa das comissões. Cada usuário
-- tem seus canais (Shopee, Mercado Livre, ...) com comissão % e taxa fixa por peça.
--
-- Regra da taxa numa venda com canal:
--   fees = faturamento × (taxa administrativa + comissão do canal) + taxa fixa × peças
-- A comissão do canal SUBSTITUI a taxa de cartão de settings (a comissão do marketplace
-- já inclui o processamento do pagamento; a maquininha vira o canal "Loja física").
-- Vendas sem canal (antigas, ou chamadas sem p_channel_id) seguem a regra anterior:
--   fees = faturamento × (taxa administrativa + taxa de cartão)

create table public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  -- Identifica os canais criados por padrão (null nos criados pelo usuário).
  slug text check (slug in ('shopee', 'mercado_livre', 'tiktok_shop', 'instagram_whatsapp', 'loja_fisica', 'pix')),
  commission numeric(5,4) not null default 0 check (commission >= 0 and commission < 1),
  fixed_fee numeric(10,2) not null default 0 check (fixed_fee >= 0),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- Alvo da FK composta de sales: garante que o canal da venda é do mesmo usuário.
  unique (id, user_id),
  unique (user_id, slug)
);

create unique index sales_channels_user_name_unique
  on public.sales_channels (user_id, lower(btrim(name)));

alter table public.sales_channels enable row level security;

-- Sem política de delete: canal usado em vendas não pode sumir. O usuário desativa.
create policy "sales_channels_select_own" on public.sales_channels for select using (user_id = auth.uid());
create policy "sales_channels_insert_own" on public.sales_channels for insert with check (user_id = auth.uid());
create policy "sales_channels_update_own" on public.sales_channels for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Canais padrão, todos zerados (as taxas dos marketplaces variam por contrato e mudam com
-- frequência; um valor pré-preenchido errado distorceria o lucro). A exceção é a loja
-- física, que herda a taxa de cartão: é a mesma taxa de maquininha que o usuário já usava.
create function public.seed_default_sales_channels(p_user_id uuid, p_card_fee numeric)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.sales_channels (user_id, name, slug, commission, position)
  values
    (p_user_id, 'Shopee', 'shopee', 0, 1),
    (p_user_id, 'Mercado Livre', 'mercado_livre', 0, 2),
    (p_user_id, 'TikTok Shop', 'tiktok_shop', 0, 3),
    (p_user_id, 'Instagram / WhatsApp', 'instagram_whatsapp', 0, 4),
    (p_user_id, 'Loja física / maquininha', 'loja_fisica', coalesce(p_card_fee, 0), 5),
    (p_user_id, 'Pix', 'pix', 0, 6)
  on conflict do nothing;
$$;

revoke execute on function public.seed_default_sales_channels(uuid, numeric) from public, anon, authenticated;

-- Toda conta ganha settings no pagamento (ou pelo admin); os canais nascem junto.
create function public.seed_sales_channels_on_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_sales_channels(new.user_id, new.card_fee);
  return new;
end;
$$;

create trigger settings_seed_sales_channels
  after insert on public.settings
  for each row execute function public.seed_sales_channels_on_settings();

-- Contas que já existem.
select public.seed_default_sales_channels(user_id, card_fee) from public.settings;

alter table public.sales
  add column channel_id uuid,
  add constraint sales_channel_id_user_id_fkey
    foreign key (channel_id, user_id) references public.sales_channels(id, user_id);

create index sales_channel_id_idx on public.sales (channel_id);

-- register_sale ganha p_channel_id no fim, com default null. A versão anterior (5
-- parâmetros) é removida antes para não haver ambiguidade de assinatura no PostgREST.
-- O corpo é o da migration 20260929000000, mudando só o cálculo de v_fees e o insert.
drop function public.register_sale(jsonb, text, numeric, timestamptz, text);

create or replace function public.register_sale(
  p_items jsonb,
  p_payment_method text,
  p_discount numeric default 0,
  p_sale_date timestamptz default now(),
  p_customer_name text default null,
  p_channel_id uuid default null
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
  v_locked_stock integer;
  v_quantity integer;
  v_unit_price numeric;
  v_unit_cost numeric;
  v_subtotal numeric;
  v_profit numeric;
  v_gross_revenue numeric;
  v_total_quantity integer;
  v_net_profit numeric;
  v_packaging_cost numeric;
  v_gift_cost numeric;
  v_shipping_cost numeric;
  v_traffic_cost numeric;
  v_admin_fee numeric;
  v_card_fee numeric;
  v_channel_commission numeric;
  v_channel_fixed_fee numeric;
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

  if p_channel_id is not null then
    select commission, fixed_fee
      into v_channel_commission, v_channel_fixed_fee
    from public.sales_channels
    where id = p_channel_id
      and user_id = v_user_id
      and active;

    if not found then
      raise exception 'Canal de venda não encontrado ou inativo';
    end if;
  end if;

  -- valida estoque suficiente por produto, somando quantidades repetidas do mesmo
  -- produto, e trava a linha do produto (for update) para serializar contra vendas
  -- concorrentes do mesmo produto até o fim desta transação.
  for v_stock_check in
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer) as total_quantity
    from jsonb_array_elements(p_items) as item
    group by item->>'product_id'
  loop
    select stock_quantity into v_locked_stock
      from public.products
      where id = v_stock_check.product_id
        and user_id = v_user_id
      for update;

    if not found or v_locked_stock < v_stock_check.total_quantity then
      raise exception 'Produto não encontrado ou estoque insuficiente para o produto %', v_stock_check.product_id;
    end if;
  end loop;

  select
    sum((item->>'quantity')::integer * (item->>'unit_price')::numeric),
    sum((item->>'quantity')::integer)
    into v_gross_revenue, v_total_quantity
  from jsonb_array_elements(p_items) as item;

  v_gross_revenue := v_gross_revenue - coalesce(p_discount, 0);

  if p_channel_id is not null then
    -- Comissão do canal no lugar da taxa de cartão; taxa fixa cobrada por peça.
    v_fees := v_gross_revenue * (v_admin_fee + v_channel_commission) + v_channel_fixed_fee * v_total_quantity;
  else
    v_fees := v_gross_revenue * (v_admin_fee + v_card_fee);
  end if;

  insert into public.sales (
    user_id, sale_date, payment_method, discount, gross_revenue, fees,
    shipping_cost, packaging_cost, gift_cost, traffic_cost, net_profit, customer_name, channel_id
  ) values (
    v_user_id, p_sale_date, p_payment_method, coalesce(p_discount, 0), v_gross_revenue, v_fees,
    v_shipping_cost, v_packaging_cost, v_gift_cost, v_traffic_cost, 0,
    nullif(btrim(p_customer_name), ''), p_channel_id
  ) returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;

    select cost + entry_shipping into v_unit_cost from public.products
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
  v_net_profit := v_net_profit - coalesce(p_discount, 0) - v_fees - v_shipping_cost - v_packaging_cost - v_gift_cost - v_traffic_cost;

  update public.sales set net_profit = v_net_profit where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.register_sale(jsonb, text, numeric, timestamptz, text, uuid) to authenticated;
