import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
};

export default async function VendasPage() {
  const supabase = await createClient();
  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_date, payment_method, gross_revenue, net_profit")
    .order("sale_date", { ascending: false })
    .limit(50);

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

      {sales && sales.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Faturamento</TableHead>
              <TableHead>Lucro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</TableCell>
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
