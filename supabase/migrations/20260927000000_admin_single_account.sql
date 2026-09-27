-- A policy profiles_update_own libera a linha inteira para o próprio usuário, o que
-- permitiria a qualquer cliente se promover com `update profiles set role = 'admin'`
-- direto pela API. Restringe o UPDATE do role authenticated à coluna `name`: `role`,
-- `email` e `id` só mudam via service_role.
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

-- Existe no máximo uma conta admin em todo o sistema. A promoção é feita manualmente
-- pelo SQL Editor do Supabase:
--   update public.profiles set role = 'admin' where email = '...';
create unique index profiles_single_admin
  on public.profiles (role)
  where role = 'admin';
