import { createClient } from "@/lib/supabase/server";
import { SaleForm } from "@/components/vendas/sale-form";
import { loadSaleFormOptions } from "@/lib/vendas/sale-form-options";

export default async function NovaVendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: products }, { channels, adminFee }] = await Promise.all([
    supabase.from("products").select("id, name, current_price, admin_fee").eq("status", "active").order("name"),
    loadSaleFormOptions(supabase, user!.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Registrar venda</h1>
      </div>
      <SaleForm
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          currentPrice: p.current_price !== null ? Number(p.current_price) : 0,
          adminFee: p.admin_fee !== null ? Number(p.admin_fee) : null,
        }))}
        channels={channels}
        adminFee={adminFee}
      />
    </div>
  );
}
