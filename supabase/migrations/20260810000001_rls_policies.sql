alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.pending_checkouts enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.goals enable row level security;
alter table public.marketing_expenses enable row level security;
alter table public.settings enable row level security;

-- pending_checkouts não tem políticas: só o service_role (que ignora RLS) acessa essa tabela,
-- usada exclusivamente pelo fluxo servidor-a-servidor de checkout/webhook.

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "subscriptions_select_own" on public.subscriptions for select using (user_id = auth.uid());

create policy "products_select_own" on public.products for select using (user_id = auth.uid());
create policy "products_insert_own" on public.products for insert with check (user_id = auth.uid());
create policy "products_update_own" on public.products for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "products_delete_own" on public.products for delete using (user_id = auth.uid());

create policy "sales_select_own" on public.sales for select using (user_id = auth.uid());
create policy "sales_insert_own" on public.sales for insert with check (user_id = auth.uid());
create policy "sales_update_own" on public.sales for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sales_delete_own" on public.sales for delete using (user_id = auth.uid());

create policy "sale_items_select_own" on public.sale_items for select using (user_id = auth.uid());
create policy "sale_items_insert_own" on public.sale_items for insert with check (user_id = auth.uid());
create policy "sale_items_update_own" on public.sale_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sale_items_delete_own" on public.sale_items for delete using (user_id = auth.uid());

create policy "inventory_movements_select_own" on public.inventory_movements for select using (user_id = auth.uid());
create policy "inventory_movements_insert_own" on public.inventory_movements for insert with check (user_id = auth.uid());

create policy "goals_select_own" on public.goals for select using (user_id = auth.uid());
create policy "goals_insert_own" on public.goals for insert with check (user_id = auth.uid());
create policy "goals_update_own" on public.goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_own" on public.goals for delete using (user_id = auth.uid());

create policy "marketing_expenses_select_own" on public.marketing_expenses for select using (user_id = auth.uid());
create policy "marketing_expenses_insert_own" on public.marketing_expenses for insert with check (user_id = auth.uid());
create policy "marketing_expenses_update_own" on public.marketing_expenses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "marketing_expenses_delete_own" on public.marketing_expenses for delete using (user_id = auth.uid());

create policy "settings_select_own" on public.settings for select using (user_id = auth.uid());
create policy "settings_insert_own" on public.settings for insert with check (user_id = auth.uid());
create policy "settings_update_own" on public.settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
