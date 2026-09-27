"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCustomerDetails,
  grantManualAccess,
  resendAccessLink,
  setCustomerAccess,
  type AdminActionResult,
  type CustomerDetails,
} from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { subscriptionStatusLabels } from "@/components/admin/status-labels";

type ActionKind = "block" | "unblock" | "grant" | "resend";

const actionCopy: Record<
  ActionKind,
  { title: string; description: (name: string) => string; confirm: string; pending: string; done: string }
> = {
  block: {
    title: "Bloquear acesso",
    description: (name) => `${name} não conseguirá mais entrar no painel até ser reativado.`,
    confirm: "Bloquear",
    pending: "Bloqueando...",
    done: "Acesso bloqueado.",
  },
  unblock: {
    title: "Reativar acesso",
    description: (name) => `${name} volta a entrar no painel normalmente.`,
    confirm: "Reativar",
    pending: "Reativando...",
    done: "Acesso reativado.",
  },
  grant: {
    title: "Liberar acesso manualmente",
    description: (name) =>
      `Cria uma assinatura ativa para ${name} sem cobrança pelo Mercado Pago (valor R$ 0,00). Use para cortesias ou pagamentos recebidos por fora.`,
    confirm: "Liberar acesso",
    pending: "Liberando...",
    done: "Acesso liberado.",
  },
  resend: {
    title: "Reenviar link de acesso",
    description: (name) =>
      `${name} receberá um e-mail com um link para definir a senha e entrar no Faturio.`,
    confirm: "Enviar e-mail",
    pending: "Enviando...",
    done: "E-mail enviado.",
  },
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return withTime ? date.toLocaleString("pt-BR") : date.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular-nums text-sm text-foreground">{value}</p>
    </div>
  );
}

// Montado com key={customerId}: cada cliente aberto começa com o estado limpo.
export function CustomerDetailsDialog({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const result = await getCustomerDetails({ customerId });
    if (result.success) {
      setCustomer(result.customer);
      setLoadError(null);
    } else {
      setLoadError(result.error);
    }
  }

  useEffect(() => {
    let cancelled = false;
    getCustomerDetails({ customerId }).then((result) => {
      if (cancelled) return;
      if (result.success) setCustomer(result.customer);
      else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function runAction() {
    if (!customer || !action) return;
    setActionPending(true);
    setActionError(null);

    const input = { customerId: customer.id };
    let result: AdminActionResult;
    if (action === "block") result = await setCustomerAccess({ ...input, blocked: true });
    else if (action === "unblock") result = await setCustomerAccess({ ...input, blocked: false });
    else if (action === "grant") result = await grantManualAccess(input);
    else result = await resendAccessLink(input);

    setActionPending(false);
    if (!result.success) {
      setActionError(result.error ?? "Erro inesperado. Tente novamente.");
      return;
    }
    setNotice(actionCopy[action].done);
    setAction(null);
    await load();
    router.refresh();
  }

  const accessStatus =
    customer?.subscriptions.find((s) => s.status === "active")?.status ??
    customer?.subscriptions.find((s) => s.status === "blocked")?.status ??
    null;

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {!customer ? (
            <DialogHeader>
              <DialogTitle>Detalhes do cliente</DialogTitle>
              <DialogDescription>{loadError ?? "Carregando..."}</DialogDescription>
            </DialogHeader>
          ) : (
            <div className="flex flex-col gap-6">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle>{customer.name}</DialogTitle>
                  <Badge variant={accessStatus === "active" ? "default" : "outline"}>
                    {accessStatus ? subscriptionStatusLabels[accessStatus] : "Sem acesso"}
                  </Badge>
                </div>
                <DialogDescription className="break-all">{customer.email}</DialogDescription>
              </DialogHeader>

              {notice && (
                <p className="rounded-[10px] bg-success/10 px-3 py-2 text-sm text-success">
                  {notice}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Cadastro" value={formatDate(customer.createdAt)} />
                <InfoItem
                  label="Último login"
                  value={customer.lastSignInAt ? formatDate(customer.lastSignInAt, true) : "Nunca"}
                />
                <InfoItem label="E-mail confirmado" value={customer.emailConfirmed ? "Sim" : "Não"} />
                <InfoItem
                  label="Onboarding"
                  value={customer.onboardingCompleted ? "Concluído" : "Não concluído"}
                />
                <InfoItem label="Produtos" value={String(customer.productCount)} />
                <InfoItem label="Vendas registradas" value={String(customer.saleCount)} />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Assinaturas</p>
                {customer.subscriptions.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-border rounded-[10px] border border-border">
                    {customer.subscriptions.map((sub) => (
                      <li key={sub.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">
                            {subscriptionStatusLabels[sub.status] ?? sub.status}
                            <span className="text-muted-foreground">
                              {" · "}
                              {sub.mercadopagoPaymentId ? "Mercado Pago" : "Manual"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Início: {formatDate(sub.startedAt ?? sub.createdAt)}
                          </p>
                        </div>
                        <p className="tabular-nums text-sm text-foreground">
                          {formatCurrency(sub.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma assinatura.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {accessStatus === "active" && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setAction("block")}>
                    Bloquear acesso
                  </Button>
                )}
                {accessStatus === "blocked" && (
                  <Button type="button" size="sm" onClick={() => setAction("unblock")}>
                    Reativar acesso
                  </Button>
                )}
                {accessStatus === null && (
                  <Button type="button" size="sm" onClick={() => setAction("grant")}>
                    Liberar acesso
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => setAction("resend")}>
                  Reenviar link de acesso
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {customer && action && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setAction(null);
              setActionError(null);
            }
          }}
          title={actionCopy[action].title}
          description={<p>{actionCopy[action].description(customer.name)}</p>}
          confirmLabel={actionCopy[action].confirm}
          pendingLabel={actionCopy[action].pending}
          destructive={action === "block"}
          pending={actionPending}
          error={actionError}
          onConfirm={runAction}
        />
      )}
    </>
  );
}
