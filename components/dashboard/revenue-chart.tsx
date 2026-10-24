"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CumulativePoint } from "@/lib/dashboard/overview";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatAxis(value: number) {
  return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
}

interface TooltipPayload {
  payload: CumulativePoint;
}

function ChartTooltip({
  active,
  payload,
  monthShort,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  monthShort: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point || point.cumulative === null) return null;
  return (
    <div className="rounded-control border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">
        {point.day} {monthShort}
      </p>
      <p className="font-mono font-semibold text-foreground">{formatCurrency(point.cumulative)}</p>
      {point.dayRevenue > 0 && (
        <p className="font-mono text-primary">+{formatCurrency(point.dayRevenue)} no dia</p>
      )}
    </div>
  );
}

/** Faturamento acumulado dia a dia, com a meta como linha tracejada. */
export function RevenueChart({
  data,
  goal,
  monthShort,
}: {
  data: CumulativePoint[];
  goal: number | null;
  /** Ex.: "set" — usado no eixo e no tooltip. */
  monthShort: string;
}) {
  const lastDay = data.length;
  const ticks = [1, 8, 15, 22, lastDay];
  const maxValue = Math.max(goal ?? 0, ...data.map((p) => p.cumulative ?? 0));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="day"
            ticks={ticks}
            tickFormatter={(day: number) => (day === 1 || day === lastDay ? `${day} ${monthShort}` : String(day))}
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
            domain={[0, maxValue > 0 ? Math.ceil(maxValue * 1.1) : 100]}
            tickFormatter={formatAxis}
          />
          {goal !== null && (
            <ReferenceLine
              y={goal}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{
                value: `Meta ${formatCurrency(goal)}`,
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
          )}
          <Tooltip content={<ChartTooltip monthShort={monthShort} />} cursor={{ stroke: "var(--border)" }} />
          <Area
            type="monotone"
            dataKey="cumulative"
            name="Faturamento"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#revenue-fill)"
            connectNulls={false}
            activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
