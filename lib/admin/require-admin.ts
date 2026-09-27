import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string | undefined;
}

export interface AdminIdentity extends AdminUser {
  /** Sessão passou pelo segundo fator (TOTP) — aal2. */
  mfaVerified: boolean;
}

export const ADMIN_MFA_PATH = "/admin/verificacao";

/**
 * Identifica a conta admin pela sessão, com ou sem 2FA concluído. O role é lido de
 * `profiles` com o client da sessão (RLS: só a própria linha), nunca de input do client.
 * Só serve para decidir para onde mandar o admin — autorização usa getAdminUser().
 */
export const getAdminIdentity = cache(async (): Promise<AdminIdentity | null> => {
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

  // O access token vem do cookie; passá-lo explicitamente faz o auth-js validá-lo no
  // servidor do Supabase (getUser(jwt)) antes de confiar no claim `aal`.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let mfaVerified = false;
  if (session) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(
      session.access_token
    );
    mfaVerified = aal?.currentLevel === "aal2";
  }

  return { id: user.id, email: user.email, mfaVerified };
});

/**
 * Retorna a conta admin somente se a sessão concluiu o 2FA; senão null. Toda Server Action
 * de admin usa esta função antes de tocar na service_role.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const identity = await getAdminIdentity();
  if (!identity?.mfaVerified) return null;
  return { id: identity.id, email: identity.email };
});

/**
 * Para páginas do painel: quem não é admin recebe 404, sem revelar que a rota existe; o
 * admin sem 2FA na sessão vai para a verificação. Precisa ser chamado em cada página —
 * layouts não re-renderizam na navegação.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const identity = await getAdminIdentity();
  if (!identity) notFound();
  if (!identity.mfaVerified) redirect(ADMIN_MFA_PATH);
  return { id: identity.id, email: identity.email };
}
