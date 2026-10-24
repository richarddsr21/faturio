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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            // Tokens do tema (não cores fixas) para o tooltip acompanhar o tema escuro do painel.
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--control-radius)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          <Legend />
          <Bar dataKey="revenue" name="Faturamento" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="profit" name="Lucro" fill="var(--lilac)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
