"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { AttentionItem, AttentionReason } from "@/lib/admin/metrics";
import { INACTIVE_AFTER_DAYS } from "@/lib/admin/metrics";
import { Badge } from "@/components/ui/badge";
import { CustomerDetailsDialog } from "@/components/admin/customer-details-dialog";

const reasonLabels: Record<AttentionReason, string> = {
  never_logged_in: "Nunca entrou",
  onboarding_pending: "Onboarding pendente",
  inactive: `Sem entrar há ${INACTIVE_AFTER_DAYS}+ dias`,
};

function detail(item: AttentionItem) {
  if (item.reason === "never_logged_in") return "Pagou e ainda não fez o primeiro login.";
  if (item.reason === "onboarding_pending") return "Entrou, mas não terminou a configuração inicial.";
  return `Último login em ${new Date(item.lastSignInAt!).toLocaleDateString("pt-BR")}.`;
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum cliente precisando de atenção. Todos os clientes ativos estão usando o Faturio.
      </p>
    );
  }

  return (
    <>
      <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto rounded-[10px] border border-border">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <Badge variant="outline">{reasonLabels[item.reason]}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {item.email} · {detail(item)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>

      {selectedId && (
        <CustomerDetailsDialog
          key={selectedId}
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
