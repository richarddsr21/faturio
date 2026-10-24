import { cn } from "@/lib/utils";

/** Pílula com a margem (ex.: "52,6%"); negativa fica em laranja. */
export function MarginPill({ margin, className }: { margin: number | null; className?: string }) {
  if (margin === null) return null;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
        margin < 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
        className
      )}
      title="Margem da venda"
    >
      {(margin * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}
