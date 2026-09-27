"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

/**
 * Busca de vendas por cliente. A lista só traz as vendas mais recentes, então o filtro
 * roda no servidor: o termo vai para a URL (?cliente=) e a página refaz a consulta.
 */
export function SalesSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const term = query.trim();
    if (term === initialQuery) return;

    const timeout = setTimeout(() => {
      startTransition(() => {
        router.replace(term ? `${pathname}?cliente=${encodeURIComponent(term)}` : pathname, {
          scroll: false,
        });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query, initialQuery, pathname, router]);

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Buscar venda pelo nome do cliente..."
        aria-label="Buscar venda pelo nome do cliente"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="pl-9"
        aria-busy={isPending}
      />
    </div>
  );
}
