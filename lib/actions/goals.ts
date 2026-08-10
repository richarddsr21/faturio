"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const goalSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  revenueGoal: z.number().min(0, "Informe uma meta válida"),
  desiredMargin: z.number().min(0).max(0.9999).optional(),
});

export interface GoalActionResult {
  success: boolean;
  error?: string;
}

export async function upsertGoal(input: z.infer<typeof goalSchema>): Promise<GoalActionResult> {
  const parsed = goalSchema.safeParse(input);
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

  // Upsert com onConflict na constraint unique(user_id, month, year) — mesmo padrão usado em
  // lib/actions/onboarding.ts, que evita a condição de corrida de um select-então-insert
  // (duas submissões concorrentes da mesma meta poderiam ambas falhar em achar uma linha
  // existente e colidir na constraint unique).
  const { error } = await supabase.from("goals").upsert(
    {
      user_id: user.id,
      month: parsed.data.month,
      year: parsed.data.year,
      revenue_goal: parsed.data.revenueGoal,
      desired_margin: parsed.data.desiredMargin ?? null,
    },
    { onConflict: "user_id,month,year" }
  );

  if (error) {
    return { success: false, error: "Não foi possível salvar a meta. Tente novamente." };
  }

  return { success: true };
}
