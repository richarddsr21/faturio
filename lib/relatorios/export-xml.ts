import type { MonthlyMetric, TopProduct } from "./monthly-report";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildReportXml(
  periodLabel: string,
  months: MonthlyMetric[],
  topProducts: TopProduct[]
): string {
  const mesesXml = months
    .map(
      (m) => `    <mes referencia="${m.month}">
      <faturamento>${m.revenue.toFixed(2)}</faturamento>
      <vendas>${m.salesCount}</vendas>
      <lucro>${m.profit.toFixed(2)}</lucro>
      <margem>${m.margin.toFixed(4)}</margem>
    </mes>`
    )
    .join("\n");

  const produtosXml = topProducts
    .map(
      (p) => `    <produto nome="${escapeXml(p.name)}">
      <quantidade>${p.quantity}</quantidade>
      <faturamento>${p.revenue.toFixed(2)}</faturamento>
    </produto>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<relatorio>
  <periodo>${escapeXml(periodLabel)}</periodo>
  <meses>
${mesesXml}
  </meses>
  <produtosMaisVendidos>
${produtosXml}
  </produtosMaisVendidos>
</relatorio>`;
}
