-- Custos próprios do produto entram no lucro da venda (#70).
--
-- products.packaging_cost/shipping_cost/gift_cost/admin_fee (migration 20260814000000) já
-- entravam no preço sugerido e no preço por canal, mas register_sale usava sempre settings.
-- Regras:
--   * Embalagem, frete e brinde são por pedido: vale o MAIOR entre os produtos da venda,
--     cada produto com o seu valor próprio ou, em branco, o de settings.
--   * Taxa administrativa por item: cada item paga a sua (própria ou de settings) sobre o
--     próprio valor, com o desconto rateado proporcionalmente.
--   * products.card_fee deixa de ser usado (saiu do formulário): com canal vale a comissão
--     do canal; sem canal, a taxa de cartão de settings, como antes.
-- Venda sem nenhum custo próprio dá exatamente o mesmo resultado da versão anterior.
-- Vendas já registradas não são recalculadas.
--
-- Mesma assinatura da migration 20261025000000; o corpo é o dela, mudando só o cálculo
-- dos custos por pedido e de v_fees.

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
  v_items_total numeric;
  v_gross_revenue numeric;
  v_total_quantity integer;
  v_net_profit numeric;
  v_packaging_cost numeric;
  v_gift_cost numeric;
  v_shipping_cost numeric;
  v_traffic_cost numeric;
  v_admin_fee numeric;
  v_card_fee numeric;
  v_admin_amount numeric;
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

  -- Totais da venda e custos próprios dos produtos. Todos os produtos já foram validados
  -- acima, então o join não descarta itens.
  select
    sum((item->>'quantity')::integer * (item->>'unit_price')::numeric),
    sum((item->>'quantity')::integer),
    max(coalesce(p.packaging_cost, v_packaging_cost)),
    max(coalesce(p.shipping_cost, v_shipping_cost)),
    max(coalesce(p.gift_cost, v_gift_cost)),
    sum((item->>'quantity')::integer * (item->>'unit_price')::numeric * coalesce(p.admin_fee, v_admin_fee))
    into v_items_total, v_total_quantity, v_packaging_cost, v_shipping_cost, v_gift_cost, v_admin_amount
  from jsonb_array_elements(p_items) as item
  join public.products p
    on p.id = (item->>'product_id')::uuid
   and p.user_id = v_user_id;

  v_gross_revenue := v_items_total - coalesce(p_discount, 0);

  -- Desconto rateado: a taxa administrativa incide sobre o valor de cada item já com a
  -- sua parte do desconto.
  if v_items_total > 0 then
    v_admin_amount := v_admin_amount * v_gross_revenue / v_items_total;
  else
    v_admin_amount := 0;
  end if;

  if p_channel_id is not null then
    -- Comissão do canal no lugar da taxa de cartão; taxa fixa cobrada por peça.
    v_fees := v_admin_amount + v_gross_revenue * v_channel_commission + v_channel_fixed_fee * v_total_quantity;
  else
    v_fees := v_admin_amount + v_gross_revenue * v_card_fee;
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
