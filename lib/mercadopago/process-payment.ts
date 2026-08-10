import { createAdminClient } from "@/lib/supabase/admin";

export interface MercadoPagoPayment {
  id: string;
  status: string;
  externalReference: string;
}

export interface ProcessPaymentResult {
  created: boolean;
  reason?: "already_processed" | "not_approved";
  userId?: string;
}

export async function processPayment(
  payment: MercadoPagoPayment
): Promise<ProcessPaymentResult> {
  const admin = createAdminClient();

  const { data: checkout, error: checkoutError } = await admin
    .from("pending_checkouts")
    .select()
    .eq("id", payment.externalReference)
    .single();

  if (checkoutError || !checkout) {
    throw new Error(
      `pending_checkout não encontrado para external_reference=${payment.externalReference}`
    );
  }

  if (payment.status !== "approved") {
    await admin
      .from("pending_checkouts")
      .update({ status: "failed", mercadopago_payment_id: payment.id })
      .eq("id", checkout.id);
    return { created: false, reason: "not_approved" };
  }

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("mercadopago_payment_id", payment.id)
    .maybeSingle();

  if (existing) {
    return { created: false, reason: "already_processed" };
  }

  let userId: string;
  let isNewUser = false;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    checkout.email,
    { data: { name: checkout.name } }
  );

  if (inviteError) {
    // Se o erro for por e-mail já registrado, reutilizar o usuário existente
    if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", checkout.email)
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
        isNewUser = false;
      } else {
        throw new Error(`Falha ao convidar usuário: ${inviteError.message}`);
      }
    } else {
      throw new Error(`Falha ao convidar usuário: ${inviteError.message}`);
    }
  } else if (!invited.user) {
    throw new Error(`Falha ao convidar usuário: resposta vazia`);
  } else {
    userId = invited.user.id;
    isNewUser = true;
  }

  if (isNewUser) {
    const { error: profileError } = await admin.from("profiles").insert({ id: userId, name: checkout.name, email: checkout.email });
    if (profileError) {
      throw new Error(`Falha ao inserir perfil: ${profileError.message}`);
    }
  }

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id: userId,
    status: "active",
    mercadopago_payment_id: payment.id,
    amount: 129.9,
    started_at: new Date().toISOString(),
  });

  if (subError) {
    // 23505 = unique_violation — outra chamada concorrente do webhook já processou
    if (subError.code === "23505") {
      return { created: false, reason: "already_processed" };
    }
    throw subError;
  }

  if (isNewUser) {
    const { error: settingsError } = await admin.from("settings").insert({ user_id: userId });
    if (settingsError) {
      throw new Error(`Falha ao inserir configurações: ${settingsError.message}`);
    }
  }

  await admin
    .from("pending_checkouts")
    .update({ status: "completed", mercadopago_payment_id: payment.id })
    .eq("id", checkout.id);

  return { created: true, userId };
}
