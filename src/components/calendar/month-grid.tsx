import Link from "next/link";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils";
import type { BookingWithEmployee } from "@/types/database";

const STATUS_DOT: Record<string, string> = {
  booked: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-destructive",
  rescheduled: "bg-warning",
  no_show: "bg-muted-foreground",
  closed: "bg-chart-2",
};

export function MonthGrid({
  anchor,
  zone,
  bookingsByDay,
  buildHref,
}: {
  /** First day of the displayed month, in the business zone. */
  anchor: DateTime;
  zone: string;
  bookingsByDay: Map<string, BookingWithEmployee[]>;
  /** Builds a link that switches to the week view of a given day. */
  buildHref: (dayISO: string) => string;
}) {
  const gridStart = anchor.startOf("month").startOf("week");
  const gridEnd = anchor.endOf("month").endOf("week");
  const today = DateTime.now().setZone(zone).toISODate();

  const days: DateTime[] = [];
  for (let d = gridStart; d <= gridEnd; d = d.plus({ days: 1 })) days.push(d);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-border text-center">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="py-2 text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = day.toISODate()!;
            const inMonth = day.month === anchor.month;
            const dayBookings = bookingsByDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                className={cn(
                  "min-h-24 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-muted/20"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      iso === today
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    )}
                  >
                    {day.day}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="flex items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-1 text-[11px] leading-tight transition-colors hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          STATUS_DOT[booking.status] ?? "bg-muted-foreground"
                        )}
                      />
                      <span className="truncate">
                        {DateTime.fromISO(booking.start_time_utc)
                          .setZone(zone)
                          .toFormat("h:mm a")}{" "}
                        {booking.first_name} {booking.last_name}
                      </span>
                    </Link>
                  ))}
                  {dayBookings.length > 3 ? (
                    <Link
                      href={buildHref(iso)}
                      className="block px-1.5 text-[11px] text-primary hover:underline"
                    >
                      +{dayBookings.length - 3} more
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
