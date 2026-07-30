import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  listBookingsInRange,
  listEmployeesForFilter,
} from "@/lib/queries/bookings";
import { businessZone } from "@/lib/queries/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekGrid } from "@/components/calendar/week-grid";
import { cn } from "@/lib/utils";
import type { BookingWithEmployee } from "@/types/database";

export const metadata: Metadata = { title: "Calendar" };

interface CalendarParams {
  view?: string;
  date?: string;
  status?: string;
  callType?: string;
  employee?: string;
}

function buildQuery(params: CalendarParams, overrides: CalendarParams): string {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  Object.entries(merged).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return `/calendar?${search.toString()}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarParams>;
}) {
  const params = await searchParams;
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const zone = businessZone();

  const view = params.view === "week" ? "week" : "month";
  const anchorInput = params.date
    ? DateTime.fromISO(params.date, { zone })
    : DateTime.now().setZone(zone);
  const anchor = anchorInput.isValid ? anchorInput : DateTime.now().setZone(zone);

  const rangeStart =
    view === "month"
      ? anchor.startOf("month").startOf("week")
      : anchor.startOf("week");
  const rangeEnd =
    view === "month" ? anchor.endOf("month").endOf("week") : anchor.endOf("week");

  const [bookings, employees] = await Promise.all([
    listBookingsInRange(
      rangeStart.toUTC().toISO()!,
      rangeEnd.toUTC().toISO()!,
      {
        status: params.status,
        callType: params.callType,
        employeeId: params.employee,
      }
    ),
    isAdmin ? listEmployeesForFilter() : Promise.resolve(undefined),
  ]);

  const bookingsByDay = new Map<string, BookingWithEmployee[]>();
  for (const booking of bookings) {
    const key = DateTime.fromISO(booking.start_time_utc)
      .setZone(zone)
      .toISODate()!;
    const list = bookingsByDay.get(key) ?? [];
    list.push(booking);
    bookingsByDay.set(key, list);
  }

  const step = view === "month" ? { months: 1 } : { weeks: 1 };
  const title =
    view === "month"
      ? anchor.toFormat("LLLL yyyy")
      : `${anchor.startOf("week").toFormat("LLL d")} – ${anchor
          .endOf("week")
          .toFormat("LLL d, yyyy")}`;

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`Times shown in ${zone.replaceAll("_", " ")}.`}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous"
            render={
              <Link
                href={buildQuery(params, {
                  date: anchor.minus(step).toISODate()!,
                  view,
                })}
              />
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildQuery(params, { date: "", view })} />}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next"
            render={
              <Link
                href={buildQuery(params, {
                  date: anchor.plus(step).toISODate()!,
                  view,
                })}
              />
            }
          >
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="ml-2 text-sm font-semibold md:text-base">{title}</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["month", "week"] as const).map((v) => (
            <Link
              key={v}
              href={buildQuery(params, { view: v })}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                view === v
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Suspense>
          <CalendarFilters employees={employees} />
        </Suspense>
      </div>

      <Card className="py-0">
        <CardContent className="p-0 md:p-4">
          {view === "month" ? (
            <MonthGrid
              anchor={anchor}
              zone={zone}
              bookingsByDay={bookingsByDay}
              buildHref={(dayISO) =>
                buildQuery(params, { view: "week", date: dayISO })
              }
            />
          ) : (
            <div className="p-4 md:p-0">
              <WeekGrid
                anchor={anchor}
                zone={zone}
                bookingsByDay={bookingsByDay}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
