-- desired_margin estava com o mesmo teto de admin_fee/card_fee (< 100%), copiado por engano
-- das taxas. Taxas precisam ficar abaixo de 100% porque entram no denominador do preço
-- recomendado (lib/finance/pricing.ts: preco = custo * (1 + margem) / (1 - taxas)); margem é
-- um multiplicador no numerador e pode legitimamente passar de 100% (produtos com markup de
-- até 800%, por exemplo). A constraint fees_and_margin_below_100_percent também somava a
-- margem junto com as taxas por engano — corrigido para considerar só as taxas.

alter table public.products drop constraint if exists products_desired_margin_check;
alter table public.products alter column desired_margin type numeric(7, 4);
alter table public.products add constraint products_desired_margin_check
  check (desired_margin >= 0 and desired_margin < 1000);

alter table public.goals drop constraint if exists goals_desired_margin_check;
alter table public.goals alter column desired_margin type numeric(7, 4);
alter table public.goals add constraint goals_desired_margin_check
  check (desired_margin >= 0 and desired_margin < 1000);

alter table public.settings drop constraint if exists fees_and_margin_below_100_percent;
alter table public.settings drop constraint if exists settings_desired_margin_check;
alter table public.settings alter column desired_margin type numeric(7, 4);
alter table public.settings add constraint settings_desired_margin_check
  check (desired_margin >= 0 and desired_margin < 1000);
alter table public.settings add constraint fees_below_100_percent
  check (admin_fee + card_fee < 1);
