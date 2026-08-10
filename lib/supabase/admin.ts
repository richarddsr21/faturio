import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Usa a service_role key, que ignora RLS. Só pode ser importado por código
 * server-only (Route Handlers, webhook). Nunca importar em Client Components.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
