-- Corrige dois problemas encontrados na revisão de 20260810000005_register_sale_function.sql:
--
-- 1) net_profit omitia o desconto: sale_items.profit é calculado sobre o subtotal
--    (quantidade * unit_price) sem desconto, então o desconto nunca era subtraído
--    em nenhum lugar do cálculo de net_profit — o lucro líquido ficava
--    superestimado exatamente no valor do desconto em toda venda com desconto.
--
-- 2) Condição de corrida na checagem de estoque: a validação de estoque
--    suficiente (`perform 1 ... where stock_quantity >= total_quantity`) não
--    travava a linha do produto. Sob read-committed (isolamento padrão do
--    Postgres), duas chamadas concorrentes vendendo o mesmo produto podiam ler o
--    mesmo stock_quantity pré-decremento, ambas passar na checagem, e o segundo
--    update levar stock_quantity a negativo — só barrado pela CHECK constraint
--    genérica (stock_quantity >= 0), com erro de constraint em vez da mensagem
--    amigável "estoque insuficiente" que a Server Action da Task 11 espera
--    capturar. Corrigido com `select ... for update` para travar a linha do
--    produto durante a checagem, serializando transações concorrentes no lock.

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
  v_locked_stock integer;
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
  v_net_profit := v_net_profit - coalesce(p_discount, 0) - v_fees - v_shipping_cost - v_packaging_cost - v_gift_cost - v_traffic_cost;

  update public.sales set net_profit = v_net_profit where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.register_sale(jsonb, text, numeric, timestamptz) to authenticated;
