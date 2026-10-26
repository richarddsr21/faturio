import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";
import { SalesChannelsForm } from "@/components/settings/sales-channels-form";
import { PlanSection, type PlanSectionProps } from "@/components/settings/plan-section";
import { effectivePlan, grantsAccess, isRecurringPlan } from "@/lib/plans";
import { loadSubscriptions } from "@/lib/subscriptions";

export default async function ConfiguracoesPage() {
  // Client da sessão: RLS restringe settings e products às linhas do próprio usuário.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: products }, { data: channels }, subscriptions] = await Promise.all([
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
    supabase
      .from("sales_channels")
      .select("id, name, commission, fixed_fee, active")
      .order("position")
      .order("created_at"),
    loadSubscriptions(supabase, user!.id),
  ]);

  // Mensal que aparece na seção Plano: a em andamento ou, se cancelada, a que ainda vale.
  const now = new Date();
  const monthlySubscription =
    subscriptions.find((s) => s.plan !== "lifetime" && ["pending", "active", "past_due"].includes(s.status)) ??
    subscriptions.find((s) => s.plan !== "lifetime" && grantsAccess(s, now));
  const monthly: PlanSectionProps["monthly"] =
    monthlySubscription && isRecurringPlan(monthlySubscription.plan)
      ? {
          plan: monthlySubscription.plan,
          status: monthlySubscription.status,
          amount: monthlySubscription.amount,
          periodEnd: monthlySubscription.current_period_end,
        }
      : null;

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
      <PlanSection
        currentPlan={effectivePlan(subscriptions, now) ?? "basic"}
        hasLifetime={subscriptions.some((s) => s.plan === "lifetime" && s.status === "active")}
        monthly={monthly}
      />
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
      <SalesChannelsForm
        channels={(channels ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          commission: Number(c.commission),
          fixedFee: Number(c.fixed_fee),
          active: c.active,
        }))}
      />
    </div>
  );
}
