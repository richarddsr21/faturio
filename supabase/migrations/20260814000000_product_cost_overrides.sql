-- Cliente pediu para poder customizar, por produto, os custos que hoje só existem como
-- valor único global em `settings` (embalagem, frete de envio, brinde, taxa administrativa,
-- taxa de cartão). Colunas nullable: NULL significa "usa o valor padrão de settings",
-- preenchido significa "este produto tem um custo diferente do padrão".
alter table public.products
  add column packaging_cost numeric(10,2) check (packaging_cost >= 0),
  add column shipping_cost numeric(10,2) check (shipping_cost >= 0),
  add column gift_cost numeric(10,2) check (gift_cost >= 0),
  add column admin_fee numeric(5,4) check (admin_fee >= 0 and admin_fee < 1),
  add column card_fee numeric(5,4) check (card_fee >= 0 and card_fee < 1);
