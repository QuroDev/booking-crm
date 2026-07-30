import {
  CalendarClock,
  CircleDot,
  Pencil,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTime } from "luxon";
import { statusLabel } from "@/lib/constants";
import type { BookingHistoryWithActor } from "@/types/database";

const ICONS: Record<BookingHistoryWithActor["action"], LucideIcon> = {
  created: PlusCircle,
  rescheduled: CalendarClock,
  status_changed: CircleDot,
  edited: Pencil,
};

function meetingLabel(
  date: string | null,
  time: string | null,
  zone: string | null
): string | null {
  if (!date || !time) return null;
  const dt = DateTime.fromISO(`${date}T${time.slice(0, 5)}`, {
    zone: zone ?? "utc",
  });
  return dt.isValid
    ? `${dt.toFormat("LLL d yyyy · h:mm a")} (${zone ?? "UTC"})`
    : null;
}

function describe(entry: BookingHistoryWithActor): string {
  switch (entry.action) {
    case "created": {
      const label = meetingLabel(
        entry.new_meeting_date,
        entry.new_meeting_time,
        entry.new_timezone
      );
      return label ? `Booked for ${label}` : "Booking created";
    }
    case "rescheduled": {
      const from = meetingLabel(
        entry.prev_meeting_date,
        entry.prev_meeting_time,
        entry.prev_timezone
      );
      const to = meetingLabel(
        entry.new_meeting_date,
        entry.new_meeting_time,
        entry.new_timezone
      );
      return from && to ? `Rescheduled: ${from} → ${to}` : "Rescheduled";
    }
    case "status_changed":
      return `Status changed: ${
        entry.prev_status ? statusLabel(entry.prev_status) : "—"
      } → ${entry.new_status ? statusLabel(entry.new_status) : "—"}`;
    case "edited": {
      const fields = (entry.details?.fields as string[] | undefined) ?? [];
      return fields.length
        ? `Details edited (${fields.map((f) => f.replaceAll("_", " ")).join(", ")})`
        : "Details edited";
    }
  }
}

export function HistoryTimeline({
  entries,
}: {
  entries: BookingHistoryWithActor[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No history yet.</p>
        ) : (
          <ol className="space-y-4">
            {entries.map((entry) => {
              const Icon = ICONS[entry.action];
              const when = DateTime.fromISO(entry.changed_at);
              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">{describe(entry)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.actor?.full_name || entry.actor?.email || "Someone"}
                      {" · "}
                      {when.isValid
                        ? when.toFormat("LLL d yyyy, h:mm a")
                        : entry.changed_at}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
