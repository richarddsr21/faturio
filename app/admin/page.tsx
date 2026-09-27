import { requireAdmin } from "@/lib/admin/require-admin";
import { getAdminOverview } from "@/lib/admin/overview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyBarChart } from "@/components/admin/monthly-bar-chart";
import { AttentionList } from "@/components/admin/attention-list";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AdminPage() {
  await requireAdmin();
  const overview = await getAdminOverview();

  const stats = [
    { label: "Clientes", value: String(overview.customerCount), hint: "contas cadastradas" },
    { label: "Acessos ativos", value: String(overview.activeCount), hint: "assinaturas ativas" },
    { label: "Bloqueados", value: String(overview.blockedCount), hint: "acesso suspenso" },
    {
      label: "Receita total",
      value: formatCurrency(overview.totalRevenue),
      hint: "pagamentos aprovados",
    },
    {
      label: "Conversão do checkout",
      value: overview.conversionRate === null ? "—" : `${overview.conversionRate.toLocaleString("pt-BR")}%`,
      hint: `${overview.paidCheckouts} pagos de ${overview.createdCheckouts} nos últimos 12 meses`,
    },
    {
      label: "Checkouts pendentes",
      value: String(overview.pendingCheckoutCount),
      hint: "aguardando pagamento",
    },
  ];

  const charts = [
    {
      title: "Receita por mês",
      description: "Assinaturas iniciadas no mês (liberações manuais contam R$ 0).",
      data: overview.revenueByMonth,
      seriesName: "Receita",
      format: "currency" as const,
    },
    {
      title: "Novos clientes por mês",
      description: "Contas criadas no mês.",
      data: overview.newCustomersByMonth,
      seriesName: "Novos clientes",
      format: "count" as const,
    },
    {
      title: "Conversão do checkout por mês",
      description: "Checkouts pagos ÷ checkouts criados no mês.",
      data: overview.conversionByMonth,
      seriesName: "Conversão",
      format: "percent" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão geral</h1>
        <p className="text-muted-foreground">Números de todos os clientes do Faturio.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="tabular-nums text-2xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Precisam de atenção
            {overview.attention.length > 0 && (
              <span className="ml-2 text-muted-foreground">({overview.attention.length})</span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Clientes com acesso ativo que não estão usando o Faturio. Clique para ver os detalhes
            e reenviar o link de acesso.
          </p>
        </div>
        <AttentionList items={overview.attention} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {charts.map((chart) => (
          <Card key={chart.title}>
            <CardHeader>
              <CardTitle className="text-base">{chart.title}</CardTitle>
              <CardDescription>{chart.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyBarChart data={chart.data} seriesName={chart.seriesName} format={chart.format} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
