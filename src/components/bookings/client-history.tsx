import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBookingLocal } from "@/lib/datetime";
import type { Booking } from "@/types/database";
import { StatusBadge } from "./status-badge";

/** Shown when the client (matched by email) has booked before. */
export function ClientHistory({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" /> Returning client
          <span className="text-xs font-normal text-muted-foreground">
            {bookings.length} previous booking{bookings.length === 1 ? "" : "s"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/bookings/${booking.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{formatBookingLocal(booking)}</p>
              {booking.notes ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {booking.notes}
                </p>
              ) : null}
            </div>
            <StatusBadge status={booking.status} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
