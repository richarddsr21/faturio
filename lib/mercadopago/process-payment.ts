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
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: checkout.email,
    email_confirm: true,
    user_metadata: { name: checkout.name },
  });

  if (createError) {
    // Se o erro for por e-mail já registrado, reutilizar o usuário existente
    if (createError.message?.includes("already registered") || createError.message?.includes("already exists")) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", checkout.email)
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
        isNewUser = false;
      } else {
        throw new Error(`Falha ao criar usuário: ${createError.message}`);
      }
    } else {
      throw new Error(`Falha ao criar usuário: ${createError.message}`);
    }
  } else if (!created.user) {
    throw new Error(`Falha ao criar usuário: resposta vazia`);
  } else {
    userId = created.user.id;
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
