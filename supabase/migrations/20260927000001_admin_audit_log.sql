-- Registro das ações feitas pela área administrativa. RLS habilitado sem nenhuma policy:
-- só a service_role (usada pelas Server Actions de admin) lê e escreve aqui.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
