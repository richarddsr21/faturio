import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomerList } from "@/components/admin/customer-list";

// Prioridade para escolher o status exibido quando o cliente tem várias assinaturas.
const statusPriority = ["active", "blocked", "pending", "cancelled", "expired"];

export default async function AdminClientesPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .eq("role", "user")
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("user_id, status"),
  ]);

  const statusByUser = new Map<string, string>();
  for (const sub of subscriptions ?? []) {
    const current = statusByUser.get(sub.user_id);
    if (!current || statusPriority.indexOf(sub.status) < statusPriority.indexOf(current)) {
      statusByUser.set(sub.user_id, sub.status);
    }
  }

  const customers = (profiles ?? []).map((profile) => ({
    ...profile,
    status: statusByUser.get(profile.id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">
          {customers.length} {customers.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}.
          Clique em um cliente para ver os detalhes.
        </p>
      </div>

      {customers.length > 0 ? (
        <CustomerList customers={customers} />
      ) : (
        <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
      )}
    </div>
  );
}
