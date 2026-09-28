import { FileDown, FileSpreadsheet, TrendingUp } from "lucide-react";

const months = [
  { label: "Abr", revenue: 29 },
  { label: "Mai", revenue: 33 },
  { label: "Jun", revenue: 31 },
  { label: "Jul", revenue: 35 },
  { label: "Ago", revenue: 38 },
  { label: "Set", revenue: 43 },
];

const maxRevenue = Math.max(...months.map((month) => month.revenue));

const comparison = [
  { label: "Faturamento", previous: "R$ 38.124", current: "R$ 42.851", change: "+12,4%" },
  { label: "Lucro", previous: "R$ 10.555", current: "R$ 11.420", change: "+8,2%" },
];

export function ReportsShowcase() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-2xl font-semibold text-foreground">Relatórios</h3>
        <p className="mt-2 text-muted-foreground">
          Compare um mês com o outro e veja se o seu negócio está crescendo. Exporte tudo em PDF
          ou Excel com um clique.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex h-28 items-end gap-3" aria-hidden="true">
          {months.map((month, index) => (
            <div key={month.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={
                  index === months.length - 1
                    ? "w-full rounded-md bg-primary"
                    : "w-full rounded-md bg-primary/25"
                }
                style={{ height: `${(month.revenue / maxRevenue) * 88}px` }}
              />
              <span className="text-[11px] text-muted-foreground">{month.label}</span>
            </div>
          ))}
        </div>
        <dl className="mt-5 flex flex-col gap-2.5 border-t border-border pt-4">
          {comparison.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="flex items-center gap-3 tabular-nums">
                <span className="hidden text-muted-foreground line-through decoration-muted-foreground/40 sm:inline">
                  {row.previous}
                </span>
                <span className="font-medium text-foreground">{row.current}</span>
                <span className="flex items-center gap-1 text-xs font-medium text-success">
                  <TrendingUp className="h-3.5 w-3.5" /> {row.change}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex gap-2">
          <span className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-xs font-medium text-foreground">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </span>
          <span className="flex items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-xs font-medium text-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </span>
        </div>
      </div>
    </div>
  );
}
