import { cn } from "@/lib/utils";

function formatPercent(fraction: number) {
  return `${(fraction * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Barra de margem com o percentual ao lado. Margem negativa fica em laranja. */
export function MarginBar({ margin, className }: { margin: number | null; className?: string }) {
  if (margin === null) {
    return <span className={cn("font-mono text-xs text-muted-foreground", className)}>sem preço</span>;
  }
  const negative = margin < 0;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn("h-full rounded-full", negative ? "bg-warning" : "bg-primary")}
          style={{ width: `${Math.min(Math.abs(margin), 1) * 100}%` }}
        />
      </div>
      <span className={cn("w-12 shrink-0 text-right font-mono text-xs", negative && "text-warning")}>
        {formatPercent(margin)}
      </span>
    </div>
  );
}
