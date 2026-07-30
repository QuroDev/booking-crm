import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <CalendarX2 className="size-10 text-muted-foreground/60" />
      <div>
        <h1 className="text-lg font-semibold">Booking not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or you don&apos;t have access to it.
        </p>
      </div>
      <Button variant="outline" render={<Link href="/bookings" />}>
        Back to bookings
      </Button>
    </div>
  );
}
