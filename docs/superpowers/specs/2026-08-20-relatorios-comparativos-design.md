# Relatórios comparativos (meses) — Design / Spec

Data: 2026-08-20
Status: Aprovado para planejamento de implementação

## 1. Visão geral

Nova página `/dashboard/relatorios` que compara métricas financeiras entre meses
(faturamento, quantidade de vendas, lucro/margem e produtos mais vendidos), com
exportação em PDF e XML. O usuário escolhe quantos meses (2 a 12) quer comparar, contando
para trás a partir do mês atual.

Objetivo: dar visibilidade de tendência (crescendo/caindo mês a mês) sem precisar cruzar
números manualmente, e permitir levar esses números pra fora do sistema (contador,
investidor, relatório interno) via PDF ou XML.

## 2. Navegação

Novo item no menu lateral (`components/dashboard/sidebar.tsx`): "Relatórios", ícone
`FileBarChart` (lucide-react), entre "Metas" e "Configurações".

## 3. Fluxo de dados

`app/dashboard/relatorios/page.tsx` (Server Component):

1. Lê `months` da query string (`?months=3`), valida com Zod (inteiro entre 2 e 12,
   default 3).
2. Calcula o range de datas: do primeiro dia do mês `(atual - months + 1)` até o início do
   mês seguinte ao atual.
3. Busca `sales` (`id, sale_date, gross_revenue, net_profit`) e `sale_items` (`product_id,
   quantity, subtotal, sale_id`) desse range em uma única query cada, mais `products (id,
   name)` para resolver nomes.
4. Agrega em memória (função pura, testável, em `lib/relatorios/monthly-report.ts`):
   - `MonthlyMetric[]`: um item por mês do range (mesmo que sem vendas), com `month` (
     `YYYY-MM`), `label` (ex. "ago/2026"), `revenue`, `salesCount`, `profit`, `margin`,
     e `revenueChangePercent`/`profitChangePercent` (variação vs. mês anterior; `null` no
     primeiro mês do range, sem mês anterior pra comparar).
   - `TopProduct[]`: top 5 produtos do período inteiro (não por mês), por `quantity`
     somada e `subtotal` somado, resolvendo `product_id` → nome via o mapa de produtos já
     carregado.
5. Passa `{ months: MonthlyMetric[], topProducts: TopProduct[], periodLabel }` como props
   para `components/relatorios/report-view.tsx` (Client Component).

Nenhuma rota de API nova — toda a exportação acontece no client a partir dos dados já
carregados na página.

## 4. UI (`report-view.tsx`)

- **Cabeçalho**: título "Relatórios", seletor "Comparar últimos N meses" (select 2–12,
  default 3, atualiza a query string via `router.push`), botões "Baixar PDF" e "Baixar
  XML" (desabilitados se `months.every(m => m.salesCount === 0)`).
- **Cards de resumo** (grid, reaproveitando `Card`/`CardHeader`/`CardContent` de
  `components/ui/card.tsx`): Faturamento total do período, variação % do último mês vs.
  anterior, melhor mês (maior faturamento), margem média do período.
- **Gráfico de barras agrupadas** (Recharts, novo componente
  `components/relatorios/comparison-chart.tsx` seguindo o padrão de
  `components/dashboard/revenue-chart.tsx` — mesmos tokens de cor, mesmo tratamento do
  tooltip com cores literais): uma barra de Faturamento e uma de Lucro por mês.
- **Tabela comparativa** (`components/ui/table.tsx`): uma linha por métrica (Faturamento,
  Nº de vendas, Lucro, Margem), uma coluna por mês, célula com variação % (▲ verde / ▼
  vermelho, mesmo padrão de cor de alerta já usado em `stock-list.tsx` com `isLow`).
- **Tabela "Produtos mais vendidos no período"**: colunas Produto, Quantidade, Faturamento
  gerado; top 5.

## 5. Exportação

### PDF

Dependência nova: `@react-pdf/renderer`. Componente
`components/relatorios/report-pdf-document.tsx` define o documento (`Page`/`View`/`Text`,
API própria da lib, não HTML/CSS) replicando a tabela comparativa e o top 5 de produtos,
com cabeçalho "Faturio — Relatório de [período]". O botão "Baixar PDF" usa o hook
`usePDF` da própria lib para gerar e disparar o download **inteiramente no navegador** —
sem Puppeteer/Chromium, sem rota de servidor, sem risco de binário faltando em produção
(Vercel).

### XML

Sem biblioteca — string XML montada à mão em
`lib/relatorios/export-xml.ts` (função pura, testável), schema próprio:

```xml
<relatorio>
  <periodo>ago/2025 a ago/2026</periodo>
  <meses>
    <mes referencia="2026-08">
      <faturamento>12345.67</faturamento>
      <vendas>42</vendas>
      <lucro>3456.78</lucro>
      <margem>0.28</margem>
    </mes>
    ...
  </meses>
  <produtosMaisVendidos>
    <produto nome="Camiseta Básica">
      <quantidade>120</quantidade>
      <faturamento>4800.00</faturamento>
    </produto>
    ...
  </produtosMaisVendidos>
</relatorio>
```

Download via `Blob` + link temporário (`<a download>` disparado por clique programático),
mesmo padrão usado pro PDF.

## 6. Casos de borda

- Mês sem vendas → métricas zeradas nesse mês; `revenueChangePercent` calculado
  normalmente (ex. de R$0 pra R$500 é +∞%, exibido como "—" em vez de um número absurdo).
- Primeiro mês do range → sem mês anterior pra comparar, `changePercent` é `null`,
  exibido sem seta/variação.
- Período inteiro sem nenhuma venda → cards mostram zero, gráfico/tabelas mostram vazio
  sem quebrar, botões de export desabilitados.
- RLS: as queries de `sales`/`sale_items`/`products` seguem o padrão já usado no resto do
  projeto (sessão do servidor via `supabase.auth.getUser()`, RLS cuida do isolamento) —
  nenhuma mudança de segurança introduzida aqui.

## 7. Testes

Vitest, unitário, sobre as funções puras (sem mock de banco):

- `lib/relatorios/monthly-report.ts`: agregação mensal correta, meses sem venda,
  cálculo de variação % (incluindo o caso "mês anterior era zero"), ranking de produtos
  com empate de quantidade (desempate por faturamento).
- `lib/relatorios/export-xml.ts`: XML bem formado para período com dados e para período
  vazio.

Geração de PDF e a UI em si são validadas manualmente (descrição do resultado esperado),
já que não há navegador disponível nesta sessão para verificação visual direta.

## 8. Fora de escopo (YAGNI)

- Comparação de períodos não-contíguos (ex. só janeiros de anos diferentes).
- Exportação em Excel/CSV (só PDF e XML foram pedidos).
- Filtro por produto/categoria dentro do relatório comparativo.
- Agendamento de envio automático do relatório por e-mail.
