import Link from "next/link";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils";
import { callTypeLabel } from "@/lib/constants";
import type { BookingWithEmployee } from "@/types/database";
import { StatusBadge } from "@/components/bookings/status-badge";

export function WeekGrid({
  anchor,
  zone,
  bookingsByDay,
}: {
  /** Any day inside the displayed week, in the business zone. */
  anchor: DateTime;
  zone: string;
  bookingsByDay: Map<string, BookingWithEmployee[]>;
}) {
  const weekStart = anchor.startOf("week");
  const today = DateTime.now().setZone(zone).toISODate();
  const days = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));

  return (
    <div className="grid gap-3 md:grid-cols-7 md:gap-0 md:divide-x md:divide-border">
      {days.map((day) => {
        const iso = day.toISODate()!;
        const dayBookings = bookingsByDay.get(iso) ?? [];
        const isToday = iso === today;
        return (
          <div key={iso} className="md:px-2 md:first:pl-0 md:last:pr-0">
            <div
              className={cn(
                "mb-2 flex items-center gap-2 md:flex-col md:items-start md:gap-0.5",
                isToday && "text-primary"
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide">
                {day.toFormat("ccc")}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isToday &&
                    "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground md:size-7"
                )}
              >
                {day.day}
              </p>
            </div>
            <div className="space-y-2 pb-2">
              {dayBookings.length === 0 ? (
                <p className="hidden text-xs text-muted-foreground/50 md:block">
                  —
                </p>
              ) : (
                dayBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="block rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/30"
                  >
                    <p className="text-xs font-semibold text-primary">
                      {DateTime.fromISO(booking.start_time_utc)
                        .setZone(zone)
                        .toFormat("h:mm a")}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium">
                      {booking.first_name} {booking.last_name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {booking.business_name} ·{" "}
                      {callTypeLabel(booking.call_type)}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge
                        status={booking.status}
                        className="px-1.5 py-0 text-[10px]"
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
