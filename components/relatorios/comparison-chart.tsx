"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ComparisonChartPoint {
  label: string;
  revenue: number;
  profit: number;
  /** Mês em andamento: barras em destaque mais suave e rótulo marcado. */
  partial?: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: value >= 1000 ? 0 : 2, minimumFractionDigits: 0 });
}

function formatAxis(value: number) {
  return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
}

function BarValue(props: { x?: unknown; y?: unknown; width?: unknown; value?: unknown }) {
  const value = Number(props.value ?? 0);
  if (!value) return null;
  return (
    <text
      x={Number(props.x) + Number(props.width) / 2}
      y={Number(props.y) - 6}
      textAnchor="middle"
      fontSize={10}
      fontFamily="var(--font-geist-mono)"
      fill="var(--foreground)"
    >
      {formatCompact(value)}
    </text>
  );
}

/** Faturamento e lucro por mês, com o valor em cima de cada barra. */
export function ComparisonChart({ data }: { data: ComparisonChartPoint[] }) {
  // Com 12 meses não cabem os valores sobre as barras; o tooltip continua mostrando.
  const showValues = data.length <= 6;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 4, left: 0, bottom: 0 }} barGap={6}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={formatAxis}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            formatter={(value, name) => [formatCurrency(Number(value)), name]}
            // Tokens do tema (não cores fixas) para o tooltip acompanhar o tema escuro do painel.
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--control-radius)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          <Bar dataKey="revenue" name="Faturamento" fill="var(--primary)" radius={[8, 8, 0, 0]} maxBarSize={56}>
            {data.map((point) => (
              <Cell key={point.label} fillOpacity={point.partial ? 0.55 : 1} />
            ))}
            {showValues && <LabelList dataKey="revenue" content={BarValue} />}
          </Bar>
          <Bar dataKey="profit" name="Lucro" fill="var(--lilac)" radius={[8, 8, 0, 0]} maxBarSize={56}>
            {data.map((point) => (
              <Cell key={point.label} fillOpacity={point.partial ? 0.55 : 1} />
            ))}
            {showValues && <LabelList dataKey="profit" content={BarValue} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
