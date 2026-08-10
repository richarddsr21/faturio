import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("settings")
    .select(
      "packaging_cost, gift_cost, shipping_cost, admin_fee, card_fee, traffic_cost, desired_margin"
    )
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Custos e taxas usados nos cálculos de preço e no dashboard.
        </p>
      </div>
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
      />
    </div>
  );
}
