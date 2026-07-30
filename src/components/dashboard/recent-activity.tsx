import Link from "next/link";
import { Activity } from "lucide-react";
import { DateTime } from "luxon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusLabel } from "@/lib/constants";
import type { ActivityEntry } from "@/lib/queries/bookings";

function describe(entry: ActivityEntry): string {
  const who = entry.actor?.full_name || entry.actor?.email || "Someone";
  const client = entry.booking
    ? `${entry.booking.first_name} ${entry.booking.last_name}`
    : "a booking";
  switch (entry.action) {
    case "created":
      return `${who} booked ${client}`;
    case "rescheduled":
      return `${who} rescheduled ${client}`;
    case "status_changed":
      return `${who} marked ${client} as ${
        entry.new_status ? statusLabel(entry.new_status).toLowerCase() : "updated"
      }`;
    case "edited":
      return `${who} edited ${client}`;
  }
}

export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Activity className="size-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => {
              const when = DateTime.fromISO(entry.changed_at);
              const content = (
                <>
                  <p className="text-sm">{describe(entry)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {when.isValid ? when.toRelative() : entry.changed_at}
                  </p>
                </>
              );
              return (
                <li key={entry.id}>
                  {entry.booking ? (
                    <Link
                      href={`/bookings/${entry.booking.id}`}
                      className="block rounded-lg p-2 -m-2 transition-colors hover:bg-muted/50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
