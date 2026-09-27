"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CustomerDetailsDialog } from "@/components/admin/customer-details-dialog";
import { subscriptionStatusLabels } from "@/components/admin/status-labels";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
  status: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  return (
    <Badge variant={status === "active" ? "default" : "outline"}>
      {status ? subscriptionStatusLabels[status] ?? status : "Sem assinatura"}
    </Badge>
  );
}

type AccessFilter = "all" | "active" | "blocked" | "none";

const filters: { value: AccessFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "blocked", label: "Bloqueados" },
  { value: "none", label: "Sem acesso" },
];

function matchesFilter(status: string | null, filter: AccessFilter) {
  if (filter === "all") return true;
  if (filter === "none") return status !== "active" && status !== "blocked";
  return status === filter;
}

// Busca sem diferenciar maiúsculas nem acentos ("joao" encontra "João").
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessFilter>("all");

  const counts = useMemo(
    () =>
      Object.fromEntries(
        filters.map((f) => [f.value, customers.filter((c) => matchesFilter(c.status, f.value)).length])
      ) as Record<AccessFilter, number>,
    [customers]
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return customers.filter(
      (c) =>
        matchesFilter(c.status, filter) &&
        (!q || normalize(c.name).includes(q) || normalize(c.email).includes(q))
    );
  }, [customers, query, filter]);

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar cliente"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por acesso">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label} <span className="tabular-nums opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="text-muted-foreground">Nenhum cliente encontrado com esses filtros.</p>
      )}

      <div className="flex flex-col gap-3 sm:hidden">
        {visible.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => setSelectedId(customer.id)}
            className="rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{customer.name}</p>
                <p className="truncate text-sm text-muted-foreground">{customer.email}</p>
              </div>
              <StatusBadge status={customer.status} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Desde {new Date(customer.created_at).toLocaleDateString("pt-BR")}
            </p>
          </button>
        ))}
      </div>

      <div className={cn("hidden", visible.length > 0 && "sm:block")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((customer) => (
              <TableRow
                key={customer.id}
                onClick={() => setSelectedId(customer.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                <TableCell className="tabular-nums">
                  {new Date(customer.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <StatusBadge status={customer.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="ghost">
                    Ver detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
