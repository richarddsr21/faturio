"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface ComparisonChartPoint {
  label: string;
  revenue: number;
  profit: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ComparisonChart({ data }: { data: ComparisonChartPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            // Cor literal, não var(--color-*): o tooltip do Recharts não herda os
            // tokens CSS corretamente (mesmo problema já visto em revenue-chart.tsx).
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9E9F2",
              borderRadius: "10px",
            }}
            labelStyle={{ color: "#1E1B4B", fontWeight: 600 }}
          />
          <Legend />
          <Bar dataKey="revenue" name="Faturamento" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="profit" name="Lucro" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
