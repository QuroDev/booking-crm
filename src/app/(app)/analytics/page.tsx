import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/queries/analytics";
import { businessZone } from "@/lib/queries/stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  BookingsOverTime,
  ByCallTypeChart,
  ByEmployeeChart,
  ByInterestChart,
  OutcomesChart,
} from "@/components/analytics/charts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [
  { key: "4w", label: "Last 4 weeks" },
  { key: "12w", label: "Last 12 weeks" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function rangeBounds(range: RangeKey): { from: DateTime; to: DateTime } {
  const now = DateTime.now().setZone(businessZone());
  switch (range) {
    case "4w":
      return { from: now.minus({ weeks: 4 }).startOf("week"), to: now.endOf("day") };
    case "12w":
      return { from: now.minus({ weeks: 12 }).startOf("week"), to: now.endOf("day") };
    case "year":
      return { from: now.startOf("year"), to: now.endOf("year") };
    case "all":
      return { from: now.minus({ years: 10 }), to: now.plus({ years: 1 }) };
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const range: RangeKey = (RANGES.find((r) => r.key === params.range)?.key ??
    "12w") as RangeKey;
  const { from, to } = rangeBounds(range);

  const analytics = await getAnalytics(
    from.toUTC().toISO()!,
    to.toUTC().toISO()!
  );

  const useMonthly = range === "year" || range === "all";
  const overTime = useMonthly
    ? analytics.byMonth.map((m) => ({ period: m.month_start, total: m.total }))
    : analytics.byWeek.map((w) => ({ period: w.week_start, total: w.total }));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Bookings, outcomes and team performance."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/analytics?range=${r.key}`}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  range === r.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Bookings {useMonthly ? "per month" : "per week"}
            </CardTitle>
            <CardDescription>By meeting date.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingsOverTime
              data={overTime}
              granularity={useMonthly ? "month" : "week"}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bookings by employee</CardTitle>
              <CardDescription>Booked vs completed.</CardDescription>
            </CardHeader>
            <CardContent>
              <ByEmployeeChart data={analytics.byEmployee} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Popular services</CardTitle>
              <CardDescription>What clients are interested in.</CardDescription>
            </CardHeader>
            <CardContent>
              <ByInterestChart data={analytics.byInterest} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call types</CardTitle>
            </CardHeader>
            <CardContent>
              <ByCallTypeChart data={analytics.byCallType} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outcomes</CardTitle>
              <CardDescription>
                Completed, cancelled, no-shows and reschedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OutcomesChart data={analytics.outcomes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
