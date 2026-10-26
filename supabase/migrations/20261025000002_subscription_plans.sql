-- Planos mensais no Mercado Pago (#11).
--
-- Até aqui todo acesso era vitalício (R$ 129,90 pago uma vez, ou liberado pelo admin).
-- Agora cada assinatura tem um plano:
--   lifetime  vitalício, sem data de expiração (não é mais vendido)
--   basic     Essencial, R$ 29,90/mês
--   pro       Pro, R$ 59,90/mês
--   premium   IA, R$ 109,90/mês
--
-- As mensais são assinaturas recorrentes do Mercado Pago (preapproval). Cada cobrança
-- aprovada estende current_period_end em um mês. Cancelada ou com pagamento falhando,
-- a assinatura continua dando acesso até current_period_end.
--
-- Um vitalício pode assinar Pro ou IA por um preço menor: fica com duas assinaturas
-- (a lifetime e a mensal) e vale o maior plano. Se a mensal acabar, volta a valer só
-- a lifetime — ela nunca perde o acesso.

-- O default 'lifetime' marca todas as assinaturas existentes (pagas ou liberadas pelo
-- admin) sem mudar o status de nenhuma: ninguém perde acesso. Ele também mantém
-- funcionando o código que insere sem informar o plano (webhook de pagamento único e
-- liberação pelo admin), que continuam criando acesso vitalício.
alter table public.subscriptions
  add column plan text not null default 'lifetime'
    check (plan in ('lifetime', 'basic', 'pro', 'premium')),
  add column current_period_end timestamptz,
  add column mercadopago_preapproval_id text unique;

-- Vitalícia não tem período nem preapproval; mensal sempre vem de um preapproval.
alter table public.subscriptions
  add constraint subscriptions_plan_shape check (
    (plan = 'lifetime' and current_period_end is null and mercadopago_preapproval_id is null)
    or (plan <> 'lifetime' and mercadopago_preapproval_id is not null)
  );

-- past_due: a cobrança do mês falhou e o Mercado Pago ainda está tentando de novo.
alter table public.subscriptions
  drop constraint subscriptions_status_check,
  add constraint subscriptions_status_check
    check (status in ('pending', 'active', 'past_due', 'expired', 'cancelled', 'blocked'));

-- Antes: no máximo uma assinatura active por usuário. Agora: no máximo uma vitalícia
-- ativa e no máximo uma mensal em andamento (active ou past_due) por usuário.
-- Cancelada não entra: quem cancela pode assinar de novo antes do fim do período.
drop index public.subscriptions_one_active_per_user;

create unique index subscriptions_one_active_lifetime_per_user
  on public.subscriptions (user_id)
  where status = 'active' and plan = 'lifetime';

create unique index subscriptions_one_open_recurring_per_user
  on public.subscriptions (user_id)
  where status in ('active', 'past_due') and plan <> 'lifetime';

-- Alvo da FK composta de subscription_payments.
alter table public.subscriptions
  add constraint subscriptions_id_user_id_unique unique (id, user_id);

-- Cobranças mensais aprovadas que já estenderam o período. O id da cobrança do Mercado
-- Pago (authorized_payment) é único: o mesmo webhook repetido não estende duas vezes.
create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null,
  mercadopago_authorized_payment_id text not null unique,
  amount numeric(10,2) not null check (amount >= 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (subscription_id, user_id)
    references public.subscriptions(id, user_id) on delete cascade
);

create index subscription_payments_subscription_id on public.subscription_payments (subscription_id);

alter table public.subscription_payments enable row level security;

-- Só leitura para o próprio usuário; quem grava é o webhook (service_role).
create policy "subscription_payments_select_own" on public.subscription_payments
  for select using (user_id = auth.uid());

-- Registra uma cobrança aprovada e estende o período da assinatura, na mesma transação.
-- Devolve false se a cobrança já tinha sido registrada (webhook repetido ou concorrente).
-- O período conta a partir do fim do período atual, ou da data do pagamento se ele já
-- acabou: pagar atrasado não "rouba" dias, e pagar adiantado não perde dias.
create function public.apply_subscription_payment(
  p_subscription_id uuid,
  p_authorized_payment_id text,
  p_amount numeric,
  p_paid_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_inserted uuid;
begin
  select user_id into v_user_id
    from public.subscriptions
   where id = p_subscription_id and plan <> 'lifetime'
   for update;

  if v_user_id is null then
    raise exception 'Assinatura mensal % não encontrada', p_subscription_id;
  end if;

  insert into public.subscription_payments (user_id, subscription_id, mercadopago_authorized_payment_id, amount, paid_at)
  values (v_user_id, p_subscription_id, p_authorized_payment_id, p_amount, p_paid_at)
  on conflict (mercadopago_authorized_payment_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return false;
  end if;

  -- Bloqueada pelo admin continua bloqueada; cancelada continua cancelada (o pagamento
  -- só estende o período já pago). Fora isso, pagamento aprovado volta a ser active.
  update public.subscriptions
     set current_period_end = greatest(coalesce(current_period_end, p_paid_at), p_paid_at) + interval '1 month',
         status = case when status in ('pending', 'past_due', 'expired') then 'active' else status end
   where id = p_subscription_id;

  return true;
end;
$$;

revoke execute on function public.apply_subscription_payment(uuid, text, numeric, timestamptz) from public, anon, authenticated;

-- O checkout passa a guardar o plano escolhido. plan null = compra vitalícia antiga
-- (pagamentos de 129,90 ainda pendentes, como boleto, continuam sendo processados).
-- user_id preenchido = vitalício logado fazendo upgrade (não cria conta nova).
alter table public.pending_checkouts
  add column plan text check (plan in ('basic', 'pro', 'premium')),
  add column user_id uuid references auth.users(id) on delete cascade,
  add column mercadopago_preapproval_id text unique;
