import { createClient } from "@/lib/supabase/server";
import { StockList } from "@/components/estoque/stock-list";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, stock_quantity, minimum_stock")
    .eq("status", "active")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Estoque</h1>
        <p className="text-muted-foreground">Acompanhe e ajuste a quantidade de cada produto.</p>
      </div>
      <StockList products={products ?? []} />
    </div>
  );
}
