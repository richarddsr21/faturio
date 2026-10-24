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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            }
            // Tokens do tema (não cores fixas) para o tooltip acompanhar o tema escuro do painel.
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--control-radius)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
            itemStyle={{ color: "var(--primary)" }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Faturamento"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
