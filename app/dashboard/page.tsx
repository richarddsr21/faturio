import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Bem-vindo, {user?.email}.</p>
      <p className="mt-4 text-sm text-muted-foreground">
        Conteúdo completo do dashboard (metas, estoque, vendas, gráficos) é implementado no
        Plano 3.
      </p>
    </main>
  );
}
