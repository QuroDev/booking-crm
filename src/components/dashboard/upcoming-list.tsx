import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBookingLocal } from "@/lib/datetime";
import { callTypeLabel } from "@/lib/constants";
import type { BookingWithEmployee } from "@/types/database";
import { StatusBadge } from "@/components/bookings/status-badge";

export function UpcomingList({
  bookings,
  showEmployee,
}: {
  bookings: BookingWithEmployee[];
  showEmployee: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming calls</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CalendarPlus className="size-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Nothing scheduled —{" "}
              <Link href="/bookings/new" className="text-primary hover:underline">
                book a strategy call
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {booking.first_name} {booking.last_name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {booking.business_name}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatBookingLocal(booking)} ·{" "}
                    {callTypeLabel(booking.call_type)}
                    {showEmployee && booking.employee
                      ? ` · ${booking.employee.full_name || booking.employee.email}`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
