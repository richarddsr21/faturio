"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { cancelSubscription, startLifetimeUpgrade } from "@/lib/actions/checkout";
import {
  formatPrice,
  LIFETIME_UPGRADE_PLANS,
  LIFETIME_UPGRADE_PRICES,
  MONTHLY_PRICES,
  PLAN_NAMES,
  type LifetimeUpgradePlan,
  type Plan,
  type RecurringPlan,
} from "@/lib/plans";
import { formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export interface PlanSectionProps {
  /** Plano que vale agora (o maior entre vitalício e mensal). */
  currentPlan: Plan;
  hasLifetime: boolean;
  /** Assinatura mensal em andamento, cancelada ou com cobrança falhando; null se não tem. */
  monthly: {
    plan: RecurringPlan;
    status: string;
    amount: number;
    periodEnd: string | null;
  } | null;
}

export function PlanSection({ currentPlan, hasLifetime, monthly }: PlanSectionProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function upgrade(plan: LifetimeUpgradePlan) {
    setError(null);
    setPending(plan);
    const result = await startLifetimeUpgrade(plan);
    if (!result.success || !result.redirectUrl) {
      setError(result.error ?? "Erro inesperado. Tente novamente.");
      setPending(null);
      return;
    }
    window.location.assign(result.redirectUrl);
  }

  async function cancel() {
    setError(null);
    setPending("cancel");
    const result = await cancelSubscription();
    setPending(null);
    setConfirmingCancel(false);
    if (!result.success) {
      setError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    router.refresh();
  }

  const canCancel = monthly !== null && ["pending", "active", "past_due"].includes(monthly.status);
  const periodEnd = monthly?.periodEnd ? formatDate(monthly.periodEnd) : null;
  const canUpgrade = hasLifetime && !monthly;

  return (
    <section className="rounded-card border border-border bg-card p-5 sm:p-6" aria-labelledby="plano-titulo">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-primary">
          <CreditCard className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="plano-titulo" className="text-base font-bold">
              Plano
            </h2>
            <Badge>{PLAN_NAMES[currentPlan]}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasLifetime
              ? "Seu plano Vitalício é para sempre, com os recursos do Essencial."
              : "Assinatura mensal no Mercado Pago."}
          </p>
        </div>
      </div>

      {monthly && (
        <div className="rounded-control border border-border p-4 text-sm">
          <p className="font-semibold text-foreground">
            {PLAN_NAMES[monthly.plan]} — {formatPrice(monthly.amount)}/mês
          </p>
          <p className="mt-1 text-muted-foreground">
            {monthly.status === "pending" && "Aguardando a confirmação do primeiro pagamento."}
            {monthly.status === "active" && periodEnd && `Próxima cobrança em ${periodEnd}.`}
            {monthly.status === "past_due" &&
              `O último pagamento não foi aprovado. O Mercado Pago vai tentar de novo; seu acesso vai até ${periodEnd ?? "o fim do período pago"}.`}
            {monthly.status === "cancelled" &&
              (hasLifetime
                ? `Assinatura cancelada. O ${PLAN_NAMES[monthly.plan]} vale até ${periodEnd}; depois você continua no Vitalício.`
                : `Assinatura cancelada. Seu acesso vai até ${periodEnd}.`)}
          </p>

          {canCancel &&
            (confirmingCancel ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="text-foreground">
                  {hasLifetime
                    ? "Cancelar? Você volta para o Vitalício no fim do período pago."
                    : "Cancelar? Você perde o acesso no fim do período pago."}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmingCancel(false)} disabled={!!pending}>
                    Manter
                  </Button>
                  <Button size="sm" onClick={cancel} disabled={!!pending}>
                    {pending === "cancel" ? "Cancelando..." : "Sim, cancelar"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setConfirmingCancel(true)}>
                Cancelar assinatura
              </Button>
            ))}
        </div>
      )}

      {canUpgrade && (
        <div className="grid gap-3 sm:grid-cols-2">
          {LIFETIME_UPGRADE_PLANS.map((plan) => (
            <div key={plan} className="flex flex-col rounded-control border border-border p-4">
              <p className="font-semibold text-foreground">{PLAN_NAMES[plan]}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="line-through">{formatPrice(MONTHLY_PRICES[plan])}</span>{" "}
                <span className="font-semibold text-foreground">{formatPrice(LIFETIME_UPGRADE_PRICES[plan])}/mês</span>{" "}
                para quem é Vitalício
              </p>
              <Button size="sm" className="mt-3 w-fit" onClick={() => upgrade(plan)} disabled={!!pending}>
                {pending === plan ? "Redirecionando..." : `Assinar o ${PLAN_NAMES[plan]}`}
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-3">
          {error}
        </Alert>
      )}
    </section>
  );
}
