import type { createClient } from "@/lib/supabase/server";
import { loadActiveSalesChannels, type ActiveSalesChannel } from "@/lib/sales-channels";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface SaleFormOptions {
  /** Canais ativos, na ordem de Configurações. */
  channels: ActiveSalesChannel[];
  /** Fração, para a estimativa de taxas do formulário. */
  adminFee: number;
}

/** Canais e taxa administrativa do formulário de venda. Recebe o client da sessão (RLS). */
export async function loadSaleFormOptions(supabase: Supabase, userId: string): Promise<SaleFormOptions> {
  const [channels, { data: settings }] = await Promise.all([
    loadActiveSalesChannels(supabase, userId),
    supabase.from("settings").select("admin_fee").eq("user_id", userId).maybeSingle(),
  ]);
  return { channels, adminFee: Number(settings?.admin_fee ?? 0) };
}
