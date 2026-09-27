import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string | undefined;
}

/**
 * Retorna o usuário da sessão se ele for a conta admin, ou null. O role é lido de
 * `profiles` com o client da sessão (RLS: só a própria linha), nunca de input do client.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return null;
  return { id: user.id, email: user.email };
});

/**
 * Para páginas de /admin: quem não é admin recebe 404, sem revelar que a rota existe.
 * Precisa ser chamado em cada página — layouts não re-renderizam na navegação.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) notFound();
  return admin;
}
