import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ActiveSalesChannel {
  id: string;
  name: string;
  /** Fração (0,14 = 14%). */
  commission: number;
  /** R$ por peça. */
  fixedFee: number;
}

/** Canais ativos, na ordem de Configurações. Recebe o client da sessão (RLS). */
export async function loadActiveSalesChannels(supabase: Supabase, userId: string): Promise<ActiveSalesChannel[]> {
  const { data } = await supabase
    .from("sales_channels")
    .select("id, name, commission, fixed_fee")
    .eq("user_id", userId)
    .eq("active", true)
    .order("position")
    .order("created_at");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    commission: Number(c.commission),
    fixedFee: Number(c.fixed_fee),
  }));
}
