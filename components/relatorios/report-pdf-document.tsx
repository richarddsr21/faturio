import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { MonthlyMetric, TopProduct } from "@/lib/relatorios/monthly-report";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#6B7280", marginBottom: 16 },
  sectionTitle: { fontSize: 13, marginTop: 16, marginBottom: 8 },
  table: { display: "flex", flexDirection: "column", borderWidth: 1, borderColor: "#E5E7EB" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  headerRow: { flexDirection: "row", backgroundColor: "#F3F4F6" },
  cell: { flex: 1, padding: 6 },
  headerCell: { flex: 1, padding: 6, fontWeight: 700 },
});

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ReportPdfDocument({
  periodLabel,
  months,
  topProducts,
}: {
  periodLabel: string;
  months: MonthlyMetric[];
  topProducts: TopProduct[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Faturio — Relatório de {periodLabel}</Text>
        <Text style={styles.subtitle}>Comparação de faturamento, vendas e lucro por mês</Text>

        <Text style={styles.sectionTitle}>Comparativo mensal</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>Mês</Text>
            <Text style={styles.headerCell}>Faturamento</Text>
            <Text style={styles.headerCell}>Vendas</Text>
            <Text style={styles.headerCell}>Lucro</Text>
            <Text style={styles.headerCell}>Margem</Text>
          </View>
          {months.map((m) => (
            <View style={styles.row} key={m.month}>
              <Text style={styles.cell}>{m.label}</Text>
              <Text style={styles.cell}>{formatCurrency(m.revenue)}</Text>
              <Text style={styles.cell}>{m.salesCount}</Text>
              <Text style={styles.cell}>{formatCurrency(m.profit)}</Text>
              <Text style={styles.cell}>{(m.margin * 100).toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Produtos mais vendidos no período</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.headerCell}>Produto</Text>
            <Text style={styles.headerCell}>Quantidade</Text>
            <Text style={styles.headerCell}>Faturamento</Text>
          </View>
          {topProducts.map((p) => (
            <View style={styles.row} key={p.productId}>
              <Text style={styles.cell}>{p.name}</Text>
              <Text style={styles.cell}>{p.quantity}</Text>
              <Text style={styles.cell}>{formatCurrency(p.revenue)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
