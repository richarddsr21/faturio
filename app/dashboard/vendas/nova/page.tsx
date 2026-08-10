import { createClient } from "@/lib/supabase/server";
import { SaleForm } from "@/components/vendas/sale-form";

export default async function NovaVendaPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, current_price")
    .eq("status", "active")
    .order("name");

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
        }))}
      />
    </div>
  );
}
