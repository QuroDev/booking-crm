"use client";

import { DateTime } from "luxon";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { callTypeLabel, statusLabel } from "@/lib/constants";

const EMPTY_HINT = (
  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
    No data for this period yet.
  </div>
);

/* ── Bookings over time ─────────────────────────────────────────────────── */

export function BookingsOverTime({
  data,
  granularity,
}: {
  data: { period: string; total: number }[];
  granularity: "week" | "month";
}) {
  if (data.length === 0) return EMPTY_HINT;

  const config = {
    total: { label: "Bookings", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const formatted = data.map((d) => ({
    ...d,
    label: DateTime.fromISO(d.period).toFormat(
      granularity === "week" ? "LLL d" : "LLL yyyy"
    ),
  }));

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <AreaChart data={formatted} margin={{ left: -20, right: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="total"
          type="monotone"
          fill="var(--color-total)"
          fillOpacity={0.2}
          stroke="var(--color-total)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/* ── Bookings by employee ───────────────────────────────────────────────── */

export function ByEmployeeChart({
  data,
}: {
  data: { employee_name: string; total: number; completed: number }[];
}) {
  if (data.length === 0) return EMPTY_HINT;

  const config = {
    total: { label: "Booked", color: "var(--chart-1)" },
    completed: { label: "Completed", color: "var(--chart-5)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} margin={{ left: -20, right: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="employee_name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
        <Bar
          dataKey="completed"
          fill="var(--color-completed)"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

/* ── Donuts: call types + outcomes ──────────────────────────────────────── */

const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

function Donut({
  data,
}: {
  data: { name: string; key: string; total: number }[];
}) {
  if (data.length === 0) return EMPTY_HINT;

  const config = Object.fromEntries(
    data.map((d, i) => [
      d.key,
      { label: d.name, color: DONUT_COLORS[i % DONUT_COLORS.length] },
    ])
  ) satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="mx-auto h-64 w-full max-w-xs">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
        <Pie
          data={data}
          dataKey="total"
          nameKey="key"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.key}
              fill={DONUT_COLORS[i % DONUT_COLORS.length]}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="key" />} />
      </PieChart>
    </ChartContainer>
  );
}

export function ByCallTypeChart({
  data,
}: {
  data: { call_type: string; total: number }[];
}) {
  return (
    <Donut
      data={data.map((d) => ({
        key: d.call_type,
        name: callTypeLabel(d.call_type),
        total: d.total,
      }))}
    />
  );
}

export function OutcomesChart({
  data,
}: {
  data: { status: string; total: number }[];
}) {
  return (
    <Donut
      data={data.map((d) => ({
        key: d.status,
        name: statusLabel(d.status),
        total: d.total,
      }))}
    />
  );
}

/* ── Popular services (interests) ───────────────────────────────────────── */

export function ByInterestChart({
  data,
}: {
  data: { interest: string; total: number }[];
}) {
  if (data.length === 0) return EMPTY_HINT;

  const config = {
    total: { label: "Bookings", color: "var(--chart-4)" },
  } satisfies ChartConfig;

  const top = data.slice(0, 8);

  return (
    <ChartContainer
      config={config}
      className="w-full"
      style={{ height: Math.max(160, top.length * 36) }}
    >
      <BarChart data={top} layout="vertical" margin={{ left: 10, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="interest"
          width={110}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
