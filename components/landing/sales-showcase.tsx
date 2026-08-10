import { ArrowRight } from "lucide-react";

export function SalesShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-2xl font-semibold text-foreground">Vendas</h3>
        <p className="mt-2 text-muted-foreground">
          Registre uma venda e veja o impacto no seu faturamento e lucro na hora.
        </p>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Tênis Premium</p>
          <p className="text-xs text-muted-foreground">2 unidades · 10/08/2026</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="tabular-nums text-foreground">R$ 174,28</span>
            <span className="tabular-nums text-success">+R$ 74,28 lucro</span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
      </div>
    </div>
  );
}
