import Link from "next/link";
import { CalendarX2, Video, Phone, MessageCircle, Tv } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBookingLocal } from "@/lib/datetime";
import { callTypeLabel } from "@/lib/constants";
import type { BookingWithEmployee, CallType } from "@/types/database";
import { StatusBadge } from "./status-badge";

const CALL_ICONS: Record<CallType, typeof Video> = {
  google_meet: Video,
  phone: Phone,
  facetime: Tv,
  whatsapp: MessageCircle,
};

export function BookingList({
  bookings,
  showEmployee,
}: {
  bookings: BookingWithEmployee[];
  showEmployee: boolean;
}) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <CalendarX2 className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No bookings found</p>
          <p className="text-xs text-muted-foreground">
            Try different filters, or book your first strategy call.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="grid gap-3 md:hidden">
        {bookings.map((booking) => {
          const Icon = CALL_ICONS[booking.call_type];
          return (
            <Link key={booking.id} href={`/bookings/${booking.id}`}>
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {booking.first_name} {booking.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {booking.business_name}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBookingLocal(booking)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon className="size-3.5" />
                      {callTypeLabel(booking.call_type)}
                    </span>
                    {showEmployee && booking.employee ? (
                      <span className="truncate">
                        by {booking.employee.full_name || booking.employee.email}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Meeting (client time)</TableHead>
              <TableHead>Call type</TableHead>
              {showEmployee ? <TableHead>Booked by</TableHead> : null}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => {
              const Icon = CALL_ICONS[booking.call_type];
              return (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="block hover:text-primary"
                    >
                      {booking.first_name} {booking.last_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {booking.business_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatBookingLocal(booking)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="size-3.5" />
                      {callTypeLabel(booking.call_type)}
                    </span>
                  </TableCell>
                  {showEmployee ? (
                    <TableCell className="text-muted-foreground">
                      {booking.employee?.full_name ||
                        booking.employee?.email ||
                        "—"}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
