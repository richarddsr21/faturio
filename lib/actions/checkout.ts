"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMercadoPagoPreference } from "@/lib/mercadopago/client";

const checkoutSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
});

export interface CheckoutResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export async function startCheckout(input: {
  name: string;
  email: string;
}): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();

  const { data: checkout, error } = await admin
    .from("pending_checkouts")
    .insert({ name: parsed.data.name, email: parsed.data.email })
    .select()
    .single();

  if (error || !checkout) {
    return { success: false, error: "Não foi possível iniciar o checkout. Tente novamente." };
  }

  try {
    const preference = await createMercadoPagoPreference({
      externalReference: checkout.id,
      payerEmail: parsed.data.email,
    });
    return { success: true, redirectUrl: preference.init_point };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[checkout] Erro ao criar preferência no Mercado Pago: ${errorMessage}`);
    return { success: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}
