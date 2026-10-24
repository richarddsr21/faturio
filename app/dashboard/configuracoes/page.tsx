import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function ConfiguracoesPage() {
  // Client da sessão: RLS restringe settings e products às linhas do próprio usuário.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: products }] = await Promise.all([
    supabase
      .from("settings")
      .select("packaging_cost, gift_cost, shipping_cost, admin_fee, card_fee, traffic_cost, desired_margin")
      .eq("user_id", user!.id)
      .single(),
    // Produtos com preço, para a prévia ao vivo.
    supabase
      .from("products")
      .select("id, name, cost, entry_shipping, current_price")
      .eq("status", "active")
      .not("current_price", "is", null)
      .order("name")
      .limit(50),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Configurações</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          Seus custos, seu preço certo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esses valores entram no cálculo de preço e no lucro de cada venda.
        </p>
      </header>
      <SettingsForm
        defaultValues={{
          packagingCost: Number(settings?.packaging_cost ?? 0),
          giftCost: Number(settings?.gift_cost ?? 0),
          shippingCost: Number(settings?.shipping_cost ?? 0),
          adminFee: Number(settings?.admin_fee ?? 0),
          cardFee: Number(settings?.card_fee ?? 0),
          trafficCost: Number(settings?.traffic_cost ?? 0),
          desiredMargin: Number(settings?.desired_margin ?? 0),
        }}
        products={(products ?? [])
          .filter((p) => Number(p.current_price) > 0)
          .map((p) => ({
            id: p.id,
            name: p.name,
            cost: Number(p.cost),
            entryShipping: Number(p.entry_shipping ?? 0),
            price: Number(p.current_price),
          }))}
      />
    </div>
  );
}
