import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/produtos/product-form";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: product }, { data: settings }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, sku, category, supplier, cost, entry_shipping, current_price, desired_margin, minimum_stock"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("settings")
      .select("packaging_cost, shipping_cost, admin_fee, card_fee, desired_margin")
      .eq("user_id", user!.id)
      .single(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Editar produto</h1>
      </div>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          supplier: product.supplier,
          cost: Number(product.cost),
          entryShipping: Number(product.entry_shipping),
          currentPrice: product.current_price !== null ? Number(product.current_price) : null,
          desiredMargin: product.desired_margin !== null ? Number(product.desired_margin) : null,
          minimumStock: product.minimum_stock,
        }}
        settings={{
          packagingCost: Number(settings?.packaging_cost ?? 0),
          shippingCost: Number(settings?.shipping_cost ?? 0),
          adminFee: Number(settings?.admin_fee ?? 0),
          cardFee: Number(settings?.card_fee ?? 0),
          desiredMargin: Number(settings?.desired_margin ?? 0),
        }}
      />
    </div>
  );
}
