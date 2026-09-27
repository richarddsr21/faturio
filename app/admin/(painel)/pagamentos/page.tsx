import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DeleteCheckoutButton } from "@/components/admin/delete-checkout-button";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  completed: "Aprovado",
  failed: "Falhou",
};

export default async function AdminPagamentosPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: checkouts } = await supabase
    .from("pending_checkouts")
    .select("id, name, email, status, mercadopago_payment_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pagamentos</h1>
        <p className="text-muted-foreground">Os 100 checkouts mais recentes do Mercado Pago.</p>
      </div>

      {checkouts && checkouts.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            {checkouts.map((checkout) => (
              <div
                key={checkout.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{checkout.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{checkout.email}</p>
                  </div>
                  <Badge variant={checkout.status === "completed" ? "default" : "outline"}>
                    {statusLabels[checkout.status] ?? checkout.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(checkout.created_at).toLocaleString("pt-BR")}
                  </p>
                  {checkout.status === "pending" && (
                    <DeleteCheckoutButton checkoutId={checkout.id} customerName={checkout.name} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ID Mercado Pago</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkouts.map((checkout) => (
                  <TableRow key={checkout.id}>
                    <TableCell className="tabular-nums">
                      {new Date(checkout.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">{checkout.name}</TableCell>
                    <TableCell className="text-muted-foreground">{checkout.email}</TableCell>
                    <TableCell>
                      <Badge variant={checkout.status === "completed" ? "default" : "outline"}>
                        {statusLabels[checkout.status] ?? checkout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {checkout.mercadopago_payment_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {checkout.status === "pending" && (
                        <DeleteCheckoutButton
                          checkoutId={checkout.id}
                          customerName={checkout.name}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
      )}
    </div>
  );
}
