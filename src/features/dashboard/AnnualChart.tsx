import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CURRENT_YEAR, formatCurrency, monthlyMetrics } from "@/mocks/hotelData";

type TooltipPayload = {
  dataKey?: string | number;
  value?: number;
  color?: string;
  name?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((item) => item.dataKey === "revenue");
  const occupancy = payload.find((item) => item.dataKey === "occupancy");
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-[var(--shadow-border)]">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {revenue ? (
        <p className="text-sm tabular-nums">
          Receita · {formatCurrency(Number(revenue.value ?? 0))}
        </p>
      ) : null}
      {occupancy ? (
        <p className="text-sm tabular-nums">
          Ocupação · {Number(occupancy.value ?? 0).toFixed(1)}%
        </p>
      ) : null}
    </div>
  );
}

export function AnnualChart() {
  const [ready, setReady] = useState(false);
  const [colors, setColors] = useState({
    revenue: "#2f5454",
    occupancy: "#1a1916",
    grid: "#ddd6cc",
    tick: "#6b6560",
  });

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    setColors({
      revenue: read("--color-chart-revenue", "#2f5454"),
      occupancy: read("--color-chart-occupancy", "#1a1916"),
      grid: read("--color-border", "#ddd6cc"),
      tick: read("--color-muted-foreground", "#6b6560"),
    });
    setReady(true);
  }, []);

  return (
    <Card className="gap-2 py-5">
      <CardHeader>
        <CardTitle>Desempenho anual · {CURRENT_YEAR}</CardTitle>
        <CardDescription>
          Receita financeira (barras) e taxa de ocupação (linha), calculadas a
          partir das reservas do hotel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="sr-only">
          {monthlyMetrics.map((row) => (
            <li key={row.month}>
              {row.month}: {formatCurrency(row.revenue)}, ocupação {row.occupancy}%
            </li>
          ))}
        </ul>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3.5 rounded-sm bg-chart-revenue" />
            Receita (R$)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-chart-occupancy" />
            Ocupação (%)
          </span>
        </div>
        <div className="h-72 w-full sm:h-80">
          {ready ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyMetrics}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: colors.tick, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: colors.tick, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(value: number) =>
                    `${Math.round(value / 1000)}k`
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: colors.tick, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "var(--color-muted)", fillOpacity: 0.45 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="revenue"
                  fill={colors.revenue}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="right"
                  dataKey="occupancy"
                  name="occupancy"
                  type="monotone"
                  stroke={colors.occupancy}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.occupancy }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-lg bg-secondary/60" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
