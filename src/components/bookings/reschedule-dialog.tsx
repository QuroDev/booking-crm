"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { rescheduleBooking } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Booking } from "@/types/database";
import { TimezoneSelect } from "./timezone-select";

export function RescheduleDialog({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(booking.meeting_date);
  const [time, setTime] = useState(booking.meeting_time.slice(0, 5));
  const [zone, setZone] = useState(booking.client_timezone);
  const [pending, setPending] = useState(false);

  const preview = useMemo(() => {
    if (!date || !time || !zone) return null;
    const dt = DateTime.fromISO(`${date}T${time}`, { zone });
    return dt.isValid ? dt.toFormat("ccc, LLL d yyyy · h:mm a (ZZZZ)") : null;
  }, [date, time, zone]);

  async function submit() {
    setPending(true);
    try {
      const result = await rescheduleBooking(booking.id, {
        meetingDate: date,
        meetingTime: time,
        timezone: zone,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      if (result.warning) toast.warning(result.warning, { duration: 8000 });
      toast.success("Meeting rescheduled — invitations updated.");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClock className="size-4" /> Reschedule
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule meeting</DialogTitle>
          <DialogDescription>
            The Google Calendar event is moved and everyone is re-invited. The
            previous time is kept in history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="res-date">New date</Label>
              <Input
                id="res-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-time">New time</Label>
              <Input
                id="res-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Time zone</Label>
            <TimezoneSelect value={zone} onChange={setZone} />
          </div>
          {preview ? (
            <div className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs">
              <span className="font-medium text-primary">
                New calendar time: {preview}
              </span>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
