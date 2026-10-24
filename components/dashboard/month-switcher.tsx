import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonthParam, monthNames, shiftMonth, type YearMonth } from "@/lib/dashboard/overview";

const arrowClass =
  "flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** ‹ Setembro 2026 › — navega por `?mes=AAAA-MM`; não avança além do mês atual. */
export function MonthSwitcher({
  value,
  current,
  basePath,
}: {
  value: YearMonth;
  current: YearMonth;
  basePath: string;
}) {
  const previous = shiftMonth(value, -1);
  const next = shiftMonth(value, 1);
  const canGoNext = next.year * 12 + next.month <= current.year * 12 + current.month;
  const name = monthNames[value.month - 1];

  return (
    <div className="inline-flex h-11 items-center gap-1 rounded-control border border-border bg-card px-1.5">
      <Link
        href={`${basePath}?mes=${formatMonthParam(previous)}`}
        aria-label={`Mês anterior (${monthNames[previous.month - 1]} ${previous.year})`}
        className={arrowClass}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-32 text-center text-sm font-semibold capitalize tabular-nums">
        {name} {value.year}
      </span>
      {canGoNext ? (
        <Link
          href={`${basePath}?mes=${formatMonthParam(next)}`}
          aria-label={`Próximo mês (${monthNames[next.month - 1]} ${next.year})`}
          className={arrowClass}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrowClass, "pointer-events-none opacity-30")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
