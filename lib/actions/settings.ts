"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settingsFieldsSchema } from "@/lib/validations/settings";

export interface SettingsActionResult {
  success: boolean;
  error?: string;
}

export async function updateSettings(
  input: z.infer<typeof settingsFieldsSchema>
): Promise<SettingsActionResult> {
  const parsed = settingsFieldsSchema.safeParse(input);
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

  const { error } = await supabase
    .from("settings")
    .update({
      packaging_cost: parsed.data.packagingCost,
      gift_cost: parsed.data.giftCost,
      shipping_cost: parsed.data.shippingCost,
      admin_fee: parsed.data.adminFee,
      card_fee: parsed.data.cardFee,
      traffic_cost: parsed.data.trafficCost,
      desired_margin: parsed.data.desiredMargin,
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Não foi possível salvar as configurações. Tente novamente." };
  }

  return { success: true };
}
