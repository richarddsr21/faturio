import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Linha de contexto abaixo do valor (ex.: "1 em agosto"). */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** Card em destaque (fundo verde-limão), como "Margem média" em Produtos. */
  highlight?: boolean;
  className?: string;
}

export function KpiCard({ label, value, hint, icon: Icon, highlight = false, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border p-4 sm:p-5",
        highlight
          ? "border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)]"
          : "border-border bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[13px] leading-tight", highlight ? "font-medium" : "text-muted-foreground")}>{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]",
              highlight ? "bg-primary-foreground/10" : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="truncate font-display text-xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className={cn("truncate text-xs", highlight ? "opacity-70" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
