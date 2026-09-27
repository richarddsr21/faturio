import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SalesSearch } from "@/components/vendas/sales-search";

const SALES_LIMIT = 50;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

// Escapa os curingas do ILIKE para que "%" e "_" digitados sejam buscados literalmente.
function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string | string[] }>;
}) {
  const { cliente } = await searchParams;
  const customerQuery = (Array.isArray(cliente) ? cliente[0] : cliente ?? "").trim().slice(0, 120);

  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select("id, sale_date, payment_method, gross_revenue, net_profit, customer_name")
    .order("sale_date", { ascending: false })
    .limit(SALES_LIMIT);
  if (customerQuery) {
    query = query.ilike("customer_name", `%${escapeLikePattern(customerQuery)}%`);
  }
  const { data: sales } = await query;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Histórico das suas vendas registradas.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vendas/nova">Registrar venda</Link>
        </Button>
      </div>

      <SalesSearch initialQuery={customerQuery} />

      {customerQuery && sales && sales.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {sales.length === SALES_LIMIT
            ? `Mostrando as ${SALES_LIMIT} vendas mais recentes de clientes com "${customerQuery}" no nome.`
            : `${sales.length} ${sales.length === 1 ? "venda" : "vendas"} de clientes com "${customerQuery}" no nome.`}
        </p>
      )}

      {customerQuery && sales?.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma venda encontrada para o cliente &quot;{customerQuery}&quot;.
        </p>
      ) : sales && sales.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    {new Date(sale.sale_date).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                  </p>
                </div>
                {sale.customer_name && (
                  <p className="mt-1 truncate text-sm text-foreground">{sale.customer_name}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                    <p className="tabular-nums text-sm text-foreground">
                      {formatCurrency(Number(sale.gross_revenue))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Lucro</p>
                    <p className="tabular-nums text-sm text-success">
                      {formatCurrency(Number(sale.net_profit))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="max-w-56 truncate">{sale.customer_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(Number(sale.gross_revenue))}</TableCell>
                    <TableCell className="tabular-nums text-success">
                      {formatCurrency(Number(sale.net_profit))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma venda registrada ainda —{" "}
          <Link href="/dashboard/vendas/nova" className="font-medium text-primary hover:underline">
            registrar venda
          </Link>
          .
        </p>
      )}
    </div>
  );
}
