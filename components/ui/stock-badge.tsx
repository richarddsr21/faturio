import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Selo de estoque: neutro, ou laranja com alerta quando está baixo. */
export function StockBadge({ quantity, low, className }: { quantity: number; low: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-medium whitespace-nowrap",
        low ? "bg-warning/15 text-warning" : "bg-muted text-foreground",
        className
      )}
      title={low ? "Estoque baixo" : undefined}
    >
      {low && <TriangleAlert className="h-3 w-3" aria-hidden />}
      {quantity} un.
      {low && <span className="sr-only">(estoque baixo)</span>}
    </span>
  );
}
