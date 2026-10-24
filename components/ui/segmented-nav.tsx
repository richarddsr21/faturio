import Link from "next/link";
import { cn } from "@/lib/utils";

interface SegmentedNavProps {
  label: string;
  items: { label: string; href: string; active: boolean }[];
  className?: string;
}

/** Seletor em segmentos que navega por URL (ex.: 7 dias / 30 dias / Tudo). */
export function SegmentedNav({ label, items, className }: SegmentedNavProps) {
  return (
    <nav aria-label={label} className={cn("inline-flex rounded-control border border-border bg-card p-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex h-9 items-center rounded-[calc(var(--control-radius)-4px)] px-3.5 text-xs font-semibold whitespace-nowrap transition-colors",
            item.active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
