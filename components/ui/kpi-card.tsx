import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Linha de contexto abaixo do valor (ex.: "1 em agosto"). */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function KpiCard({ label, value, hint, icon: Icon, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4 text-card-foreground sm:p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] leading-tight text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="truncate font-display text-[22px] font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
