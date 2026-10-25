"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { salesChannelsSchema } from "@/lib/validations/sales-channels";

export interface SalesChannelsActionResult {
  success: boolean;
  error?: string;
}

/**
 * Salva a lista de canais na ordem recebida: atualiza os que têm id e cria os novos.
 * Canais não são excluídos (vendas antigas apontam para eles); o usuário desativa.
 */
export async function saveSalesChannels(
  input: z.infer<typeof salesChannelsSchema>
): Promise<SalesChannelsActionResult> {
  const parsed = salesChannelsSchema.safeParse(input);
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

  const columns = (channel: (typeof parsed.data)[number], index: number) => ({
    name: channel.name,
    commission: channel.commission,
    fixed_fee: channel.fixedFee,
    active: channel.active,
    position: index + 1,
  });
  const writes: PromiseLike<{ error: { code: string } | null }>[] = [];
  const inserts: (ReturnType<typeof columns> & { user_id: string })[] = [];
  parsed.data.forEach((channel, index) => {
    // user_id da sessão, nunca do client; o filtro por user_id repete o que o RLS já garante.
    if (channel.id) {
      writes.push(
        supabase.from("sales_channels").update(columns(channel, index)).eq("id", channel.id).eq("user_id", user.id)
      );
    } else {
      inserts.push({ ...columns(channel, index), user_id: user.id });
    }
  });
  if (inserts.length > 0) writes.push(supabase.from("sales_channels").insert(inserts));

  const results = await Promise.all(writes);

  const error = results.find((result) => result.error)?.error;
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Já existe um canal com esse nome." };
    }
    return { success: false, error: "Não foi possível salvar os canais. Tente novamente." };
  }

  return { success: true };
}
