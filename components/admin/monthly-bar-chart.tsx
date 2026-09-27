"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { MonthlyPoint } from "@/lib/admin/metrics";

export type ChartValueFormat = "currency" | "count" | "percent";

function formatValue(value: number, format: ChartValueFormat) {
  if (format === "currency") {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (format === "percent") {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  return value.toLocaleString("pt-BR");
}

function formatAxis(value: number, format: ChartValueFormat) {
  if (format === "currency") {
    return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
  }
  if (format === "percent") return `${value}%`;
  return value.toLocaleString("pt-BR");
}

/** Barras mensais de uma única série — o título do card nomeia a série, sem legenda. */
export function MonthlyBarChart({
  data,
  seriesName,
  format,
}: {
  data: MonthlyPoint[];
  seriesName: string;
  format: ChartValueFormat;
}) {
  return (
    <>
      <div className="h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={format !== "count"}
              domain={format === "percent" ? [0, 100] : [0, "auto"]}
              tickFormatter={(value) => formatAxis(Number(value), format)}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              formatter={(value) => [formatValue(Number(value), format), seriesName]}
              // Cor literal, não var(--color-*): o tooltip do Recharts não herda os
              // tokens CSS corretamente (mesmo problema já visto em revenue-chart.tsx).
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E9E9F2",
                borderRadius: "10px",
              }}
              labelStyle={{ color: "#1E1B4B", fontWeight: 600 }}
              itemStyle={{ color: "#1E1B4B" }}
            />
            <Bar
              dataKey="value"
              name={seriesName}
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{seriesName} por mês</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">{seriesName}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{formatValue(point.value, format)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
