import type { SupabaseClient } from "@supabase/supabase-js";

export interface CheckoutCustomer {
  name: string;
  email: string;
}

/**
 * Conta do cliente que acabou de pagar: convida pelo e-mail (ele define a senha pelo link)
 * ou, se o e-mail já tem conta, reaproveita a existente. Conta nova ganha o profile aqui;
 * settings fica com quem chama, depois de criar a assinatura.
 */
export async function findOrInviteCustomer(
  admin: SupabaseClient,
  customer: CheckoutCustomer
): Promise<{ userId: string; isNewUser: boolean }> {
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(customer.email, {
    data: { name: customer.name },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
  });

  if (inviteError) {
    // Se o erro for por e-mail já registrado, reutilizar o usuário existente
    if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", customer.email)
        .maybeSingle();

      if (existingProfile?.id) {
        return { userId: existingProfile.id, isNewUser: false };
      }
    }
    throw new Error(`Falha ao convidar usuário: ${inviteError.message}`);
  }

  if (!invited.user) {
    throw new Error(`Falha ao convidar usuário: resposta vazia`);
  }

  const userId = invited.user.id;
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, name: customer.name, email: customer.email });
  if (profileError) {
    throw new Error(`Falha ao inserir perfil: ${profileError.message}`);
  }

  return { userId, isNewUser: true };
}
