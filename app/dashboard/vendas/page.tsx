import { createClient } from "@/lib/supabase/server";
import { SalesScreen } from "@/components/vendas/sales-screen";
import { parseSalesPeriod, periodStart, summarizeSales, type SalesPeriod } from "@/lib/vendas/sales-view";

const PAGE_SIZE = 50;
const MAX_LIMIT = 1000;
// O PostgREST devolve no máximo 1000 linhas por requisição; os totais leem em blocos.
const SUMMARY_CHUNK = 1000;

// Escapa os curingas do ILIKE para que "%" e "_" digitados sejam buscados literalmente.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string | string[]; periodo?: string | string[]; limite?: string | string[] }>;
}) {
  const params = await searchParams;
  const customerQuery = (first(params.cliente) ?? "").trim().slice(0, 120);
  const period = parseSalesPeriod(first(params.periodo));
  const requestedLimit = Number(first(params.limite));
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, PAGE_SIZE), MAX_LIMIT)
    : PAGE_SIZE;
  const start = periodStart(period, new Date());

  // Client da sessão: RLS restringe sales às linhas do próprio usuário.
  const supabase = await createClient();

  function filtered<T extends { gte: (c: string, v: string) => T; ilike: (c: string, v: string) => T }>(query: T) {
    let q = query;
    if (start) q = q.gte("sale_date", start.toISOString());
    if (customerQuery) q = q.ilike("customer_name", `%${escapeLikePattern(customerQuery)}%`);
    return q;
  }

  // Busca uma venda a mais que o limite só para saber se existe próxima página.
  const listPromise = filtered(
    supabase.from("sales").select("id, sale_date, payment_method, gross_revenue, net_profit, customer_name")
  )
    .order("sale_date", { ascending: false })
    .limit(limit + 1);

  const anySalePromise = supabase.from("sales").select("id", { count: "exact", head: true });

  async function loadSummaryRows() {
    const rows: { gross_revenue: number | string; net_profit: number | string; payment_method: string }[] = [];
    for (let from = 0; ; from += SUMMARY_CHUNK) {
      const { data, error } = await filtered(
        supabase.from("sales").select("gross_revenue, net_profit, payment_method")
      )
        .order("sale_date", { ascending: false })
        .order("id")
        .range(from, from + SUMMARY_CHUNK - 1);
      if (error || !data) break;
      rows.push(...data);
      if (data.length < SUMMARY_CHUNK) break;
    }
    return rows;
  }

  const [{ data: listData }, { count: anySaleCount }, summaryRows] = await Promise.all([
    listPromise,
    anySalePromise,
    loadSummaryRows(),
  ]);

  const list = listData ?? [];
  const hasMore = list.length > limit;

  function hrefFor(changes: { periodo?: SalesPeriod; limite?: number }) {
    const next = new URLSearchParams();
    if (customerQuery) next.set("cliente", customerQuery);
    const nextPeriod = changes.periodo ?? period;
    if (nextPeriod !== "tudo") next.set("periodo", nextPeriod);
    // Trocar de período volta para a primeira página.
    if (changes.limite && !changes.periodo) next.set("limite", String(changes.limite));
    const search = next.toString();
    return search ? `/dashboard/vendas?${search}` : "/dashboard/vendas";
  }

  return (
    <SalesScreen
      summary={summarizeSales(
        summaryRows.map((r) => ({
          grossRevenue: Number(r.gross_revenue),
          netProfit: Number(r.net_profit),
          paymentMethod: r.payment_method,
        }))
      )}
      sales={list.slice(0, limit).map((s) => ({
        id: s.id,
        saleDate: s.sale_date,
        paymentMethod: s.payment_method,
        grossRevenue: Number(s.gross_revenue),
        netProfit: Number(s.net_profit),
        customerName: s.customer_name,
      }))}
      period={period}
      customerQuery={customerQuery}
      hrefFor={hrefFor}
      nextLimit={hasMore && limit < MAX_LIMIT ? Math.min(limit + PAGE_SIZE, MAX_LIMIT) : null}
      hasAnySale={(anySaleCount ?? 0) > 0}
    />
  );
}
