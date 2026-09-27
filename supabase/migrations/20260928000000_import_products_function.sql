-- Importação de produtos por planilha (a pedido de cliente). Cria vários produtos numa
-- única transação: se qualquer linha falhar, nada é gravado. security invoker: roda com as
-- permissões e o RLS do usuário da sessão, e o user_id vem de auth.uid() — nunca do payload.
--
-- p_products: array de objetos com as chaves name, sku, category, supplier, cost,
-- entry_shipping, current_price, desired_margin (fração: 0.4 = 40%), initial_stock,
-- minimum_stock. A validação de formato é feita antes, na Server Action; as constraints
-- das tabelas continuam valendo aqui.
--
-- Linhas com SKU que já existe no cadastro do usuário (sem diferenciar maiúsculas nem
-- espaços nas pontas) são puladas — importar não sobrescreve preço nem estoque.
-- Retorna quantos produtos foram criados.
create or replace function public.import_products(p_products jsonb)
returns integer
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_sku text;
  v_initial_stock integer;
  v_product_id uuid;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  if jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) > 500 then
    raise exception 'Envie de 1 a 500 produtos por importação';
  end if;

  for v_item in select * from jsonb_array_elements(p_products)
  loop
    v_sku := nullif(btrim(v_item->>'sku'), '');

    if v_sku is not null and exists (
      select 1 from public.products
       where user_id = v_user_id
         and lower(btrim(sku)) = lower(v_sku)
    ) then
      continue;
    end if;

    v_initial_stock := coalesce((v_item->>'initial_stock')::integer, 0);

    insert into public.products (
      user_id, name, sku, category, supplier, cost, entry_shipping, current_price,
      desired_margin, stock_quantity, minimum_stock
    ) values (
      v_user_id,
      btrim(v_item->>'name'),
      v_sku,
      nullif(btrim(v_item->>'category'), ''),
      nullif(btrim(v_item->>'supplier'), ''),
      (v_item->>'cost')::numeric,
      coalesce((v_item->>'entry_shipping')::numeric, 0),
      (v_item->>'current_price')::numeric,
      (v_item->>'desired_margin')::numeric,
      v_initial_stock,
      coalesce((v_item->>'minimum_stock')::integer, 0)
    )
    returning id into v_product_id;

    -- Mesmo registro que o cadastro manual gera para o estoque inicial.
    if v_initial_stock > 0 then
      insert into public.inventory_movements (user_id, product_id, type, quantity, unit_cost, reason)
      values (v_user_id, v_product_id, 'initial', v_initial_stock, (v_item->>'cost')::numeric, 'Estoque inicial (importação)');
    end if;

    v_inserted := v_inserted + 1;
  end loop;

  return v_inserted;
end;
$$;

revoke execute on function public.import_products(jsonb) from public, anon;
grant execute on function public.import_products(jsonb) to authenticated;
