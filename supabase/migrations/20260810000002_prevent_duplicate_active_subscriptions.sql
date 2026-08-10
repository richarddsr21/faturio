-- Impede que um mesmo usuário tenha mais de uma assinatura "active" simultaneamente.
-- Sem essa constraint, o middleware pode encontrar múltiplas linhas ao consultar
-- subscriptions por user_id + status=active, o que faz .maybeSingle() retornar
-- data: null (erro descartado) e redireciona um cliente pagante de volta ao /checkout.
create unique index subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status = 'active';
