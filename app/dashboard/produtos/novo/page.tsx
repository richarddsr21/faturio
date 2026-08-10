import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/produtos/product-form";

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase
    .from("settings")
    .select("packaging_cost, shipping_cost, admin_fee, card_fee, desired_margin")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Novo produto</h1>
      </div>
      <ProductForm
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
