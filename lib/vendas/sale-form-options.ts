import type { createClient } from "@/lib/supabase/server";
import type { SaleFormChannel } from "@/components/vendas/sale-form";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface SaleFormOptions {
  /** Canais ativos, na ordem de Configurações. */
  channels: SaleFormChannel[];
  /** Fração, para a estimativa de taxas do formulário. */
  adminFee: number;
}

/** Canais e taxa administrativa do formulário de venda. Recebe o client da sessão (RLS). */
export async function loadSaleFormOptions(supabase: Supabase, userId: string): Promise<SaleFormOptions> {
  const [{ data: channels }, { data: settings }] = await Promise.all([
    supabase
      .from("sales_channels")
      .select("id, name, commission, fixed_fee")
      .eq("user_id", userId)
      .eq("active", true)
      .order("position")
      .order("created_at"),
    supabase.from("settings").select("admin_fee").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    channels: (channels ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      commission: Number(c.commission),
      fixedFee: Number(c.fixed_fee),
    })),
    adminFee: Number(settings?.admin_fee ?? 0),
  };
}
