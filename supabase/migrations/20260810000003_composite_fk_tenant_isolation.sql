-- sale_items.product_id e inventory_movements.product_id referenciavam products(id)
-- sem garantir que o produto pertence ao mesmo user_id da linha. RLS não protege
-- FKs entre tabelas: um usuário A poderia inserir uma linha com user_id = A mas
-- product_id de um produto do usuário B. A FK composta abaixo força o banco a
-- garantir que product_id e user_id sempre correspondem ao mesmo tenant.

alter table public.products
  add constraint products_id_user_id_unique unique (id, user_id);

alter table public.sale_items
  drop constraint sale_items_product_id_fkey,
  add constraint sale_items_product_id_user_id_fkey
    foreign key (product_id, user_id) references public.products(id, user_id);

alter table public.inventory_movements
  drop constraint inventory_movements_product_id_fkey,
  add constraint inventory_movements_product_id_user_id_fkey
    foreign key (product_id, user_id) references public.products(id, user_id);
