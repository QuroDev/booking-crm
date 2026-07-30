import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  PhoneCall,
  PhoneOutgoing,
  UserX,
  XCircle,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getCallTracker, type TrackerRange } from "@/lib/queries/tracker";
import { listCallLog } from "@/lib/queries/call-log";
import { businessZone } from "@/lib/queries/stats";
import { formatUtcInZone } from "@/lib/datetime";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CallEntryDialog } from "@/components/tracker/call-entry-dialog";
import { CallLogList } from "@/components/tracker/call-log-list";
import { CallLogSearch } from "@/components/tracker/call-log-search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Call tracker" };

const RANGES: { key: TrackerRange; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

function initials(name: string) {
  return name
    .split(/[\s@]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RateBar({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; view?: string; q?: string }>;
}) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const params = await searchParams;
  const view = params.view === "stats" ? "stats" : "log";
  const range: TrackerRange =
    (RANGES.find((r) => r.key === params.range)?.key as TrackerRange) ?? "week";

  const [data, callLog] = await Promise.all([
    view === "stats" ? getCallTracker(range) : Promise.resolve(null),
    view === "log" ? listCallLog(params.q) : Promise.resolve(null),
  ]);

  const zone = businessZone();

  return (
    <>
      <PageHeader
        title="Call tracker"
        description={
          view === "log"
            ? "The shared log of everyone we've called — check here before dialing."
            : isAdmin
              ? "Every employee's strategy calls at a glance."
              : "Your strategy calls at a glance."
        }
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(
              [
                { key: "log", label: "Call log" },
                { key: "stats", label: "Meeting stats" },
              ] as const
            ).map((tab) => (
              <Link
                key={tab.key}
                href={`/tracker${tab.key === "stats" ? "?view=stats" : ""}`}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === tab.key
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        }
      />

      {view === "log" && callLog ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Suspense>
                <CallLogSearch />
              </Suspense>
            </div>
            <CallEntryDialog
              trigger={
                <Button size="sm" className="sm:shrink-0">
                  <PhoneOutgoing className="size-4" /> Log a call
                </Button>
              }
            />
          </div>
          <CallLogList
            entries={callLog}
            currentUserId={profile.id}
            isAdmin={isAdmin}
          />
        </>
      ) : null}

      {view === "stats" && data ? (
        <>
          <div className="mb-4 flex justify-end">
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {RANGES.map((r) => (
                <Link
                  key={r.key}
                  href={`/tracker?view=stats&range=${r.key}`}
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
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              label="Calls booked"
              value={data.team.total}
              icon={PhoneCall}
              tone="primary"
            />
            <StatCard
              label="Upcoming"
              value={data.team.upcoming}
              icon={CalendarCheck2}
            />
            <StatCard
              label="Completed"
              value={data.team.completed}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="No shows"
              value={data.team.noShow}
              icon={UserX}
              tone="warning"
            />
            <StatCard
              label="Cancelled"
              value={data.team.cancelled}
              icon={XCircle}
              tone="destructive"
            />
          </div>

          {/* Mobile: cards */}
          <div className="grid gap-3 md:hidden">
            {data.stats.map((s) => (
              <Card key={s.employeeId}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9 border border-border">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initials(s.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                          {s.name}
                          {!s.isActive ? (
                            <Badge variant="outline" className="text-[10px]">
                              Inactive
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.nextCallUtc
                            ? `Next: ${formatUtcInZone(s.nextCallUtc, zone, "LLL d · h:mm a")}`
                            : "No upcoming calls"}
                        </p>
                      </div>
                    </div>
                    <RateBar rate={s.completionRate} />
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                      { label: "Booked", value: s.total },
                      { label: "Up next", value: s.upcoming },
                      { label: "Done", value: s.completed },
                      { label: "No show", value: s.noShow },
                      { label: "Cancel", value: s.cancelled },
                    ].map((cell) => (
                      <div
                        key={cell.label}
                        className="rounded-lg bg-muted/40 py-2"
                      >
                        <p className="text-sm font-semibold tabular-nums">
                          {cell.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {cell.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Booked</TableHead>
                  <TableHead className="text-right">Upcoming</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">No shows</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Next call ({zone.replaceAll("_", " ")})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stats.map((s) => (
                  <TableRow key={s.employeeId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-border">
                          <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                            {initials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {s.name}
                            {!s.isActive ? (
                              <Badge variant="outline" className="text-[10px]">
                                Inactive
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {s.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.upcoming}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {s.completed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-warning">
                      {s.noShow}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {s.cancelled}
                    </TableCell>
                    <TableCell>
                      <RateBar rate={s.completionRate} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.nextCallUtc
                        ? formatUtcInZone(
                            s.nextCallUtc,
                            zone,
                            "ccc, LLL d · h:mm a"
                          )
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : null}
    </>
  );
}
