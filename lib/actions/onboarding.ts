"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settingsFieldsBaseSchema, feesBelow100Percent } from "@/lib/validations/settings";

const onboardingSchema = settingsFieldsBaseSchema
  .extend({ revenueGoal: z.number().min(0, "Informe uma meta válida") })
  .refine(feesBelow100Percent, {
    message:
      "A soma de taxa administrativa, taxa de cartão e margem desejada precisa ser menor que 100%",
    path: ["desiredMargin"],
  });

export interface OnboardingResult {
  success: boolean;
  error?: string;
}

export async function completeOnboarding(
  input: z.infer<typeof onboardingSchema>
): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  // A meta é gravada ANTES de marcar onboarding_completed: se a inserção da meta falhar,
  // o proxy gate continua mandando o usuário de volta para /onboarding em vez de deixá-lo
  // passar direto para /dashboard com uma meta do mês faltando e sem forma de recriá-la.
  const now = new Date();
  const { error: goalError } = await supabase.from("goals").insert({
    user_id: user.id,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    revenue_goal: parsed.data.revenueGoal,
    desired_margin: parsed.data.desiredMargin,
  });

  if (goalError) {
    return { success: false, error: "Não foi possível criar a meta do mês. Tente novamente." };
  }

  const { error: settingsError } = await supabase
    .from("settings")
    .update({
      packaging_cost: parsed.data.packagingCost,
      gift_cost: parsed.data.giftCost,
      shipping_cost: parsed.data.shippingCost,
      admin_fee: parsed.data.adminFee,
      card_fee: parsed.data.cardFee,
      traffic_cost: parsed.data.trafficCost,
      desired_margin: parsed.data.desiredMargin,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (settingsError) {
    return {
      success: false,
      error: "Meta criada, mas não foi possível salvar suas configurações. Tente novamente.",
    };
  }

  return { success: true };
}
