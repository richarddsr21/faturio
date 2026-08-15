"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

export function RevenueChart({ data }: { data: RevenueChartPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            }
            // Cor literal, não var(--color-*): o tooltip do Recharts não herdava os
            // tokens CSS corretamente, resultando em texto escuro sobre fundo escuro.
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E9E9F2",
              borderRadius: "10px",
            }}
            labelStyle={{ color: "#1E1B4B", fontWeight: 600 }}
            itemStyle={{ color: "#6366F1" }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Faturamento"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
