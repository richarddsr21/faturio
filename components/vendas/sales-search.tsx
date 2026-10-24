"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";

const DEBOUNCE_MS = 300;

/**
 * Busca de vendas por cliente. A lista é paginada, então o filtro roda no servidor:
 * o termo vai para a URL (?cliente=) e a página refaz a consulta, mantendo o período.
 */
export function SalesSearch({ initialQuery, className }: { initialQuery: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const term = query.trim();
    if (term === initialQuery) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) params.set("cliente", term);
      else params.delete("cliente");
      params.delete("limite"); // nova busca volta para a primeira página
      const search = params.toString();
      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query, initialQuery, pathname, router, searchParams]);

  return (
    <SearchInput
      className={className}
      placeholder="Buscar pelo nome do cliente..."
      aria-label="Buscar venda pelo nome do cliente"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      aria-busy={isPending}
    />
  );
}
