-- Define teste@faturio.app como a única conta admin. Idempotente: pode rodar mais de uma vez.
-- As demais contas admin (se houver) voltam para 'user' — nenhuma conta é apagada.

-- Recria o índice de admin único com o predicado correto, caso uma versão errada tenha
-- sido aplicada manualmente.
drop index if exists public.profiles_single_admin;

do $$
begin
  if not exists (select 1 from public.profiles where email = 'teste@faturio.app') then
    raise exception 'Nenhum profile com e-mail teste@faturio.app. Crie a conta antes de rodar esta migration.';
  end if;

  update public.profiles
     set role = 'user'
   where role = 'admin'
     and email <> 'teste@faturio.app';

  update public.profiles
     set role = 'admin'
   where email = 'teste@faturio.app';
end
$$;

create unique index profiles_single_admin
  on public.profiles (role)
  where role = 'admin';
