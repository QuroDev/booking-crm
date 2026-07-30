"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { Loader2, Pencil, PhoneOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCallEntry } from "@/actions/call-log";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { callOutcomeLabel } from "@/lib/constants";
import type { CallLogEntryWithEmployee, CallLogOutcome } from "@/types/database";
import { CallEntryDialog } from "./call-entry-dialog";

const OUTCOME_STYLES: Record<CallLogOutcome, string> = {
  no_answer: "bg-muted text-muted-foreground border-border",
  callback: "bg-warning/15 text-warning border-warning/30",
  not_interested: "bg-destructive/15 text-destructive border-destructive/30",
  interested: "bg-primary/15 text-primary border-primary/30",
  booked: "bg-success/15 text-success border-success/30",
  wrong_number: "bg-muted text-muted-foreground border-border",
};

function OutcomeBadge({ outcome }: { outcome: CallLogOutcome }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", OUTCOME_STYLES[outcome])}
    >
      {callOutcomeLabel(outcome)}
    </Badge>
  );
}

function dateLabel(iso: string): string {
  const dt = DateTime.fromISO(iso);
  return dt.isValid ? dt.toFormat("LLL d, yyyy") : iso;
}

export function CallLogList({
  entries,
  currentUserId,
  isAdmin,
}: {
  entries: CallLogEntryWithEmployee[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<CallLogEntryWithEmployee | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  function remove(entry: CallLogEntryWithEmployee) {
    startTransition(async () => {
      const result = await deleteCallEntry(entry.id);
      if (!result.ok) toast.error(result.error ?? "Something went wrong");
      else toast.success("Call entry deleted");
      setDeleting(null);
      router.refresh();
    });
  }

  const canEdit = (entry: CallLogEntryWithEmployee) =>
    isAdmin || entry.logged_by === currentUserId;

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <PhoneOff className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No calls logged yet</p>
          <p className="text-xs text-muted-foreground">
            Log every call so the team never dials the same person twice.
          </p>
        </CardContent>
      </Card>
    );
  }

  const actions = (entry: CallLogEntryWithEmployee) => (
    <div className="flex items-center justify-end gap-1">
      {canEdit(entry) ? (
        <CallEntryDialog
          entry={entry}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Edit call entry">
              <Pencil className="size-3.5" />
            </Button>
          }
        />
      ) : null}
      {isAdmin ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete call entry"
          onClick={() => setDeleting(entry)}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Mobile: cards */}
      <div className="grid gap-3 md:hidden">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {entry.contact_name}
                    {entry.business_name ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {entry.business_name}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.phone}
                    {entry.email ? ` · ${entry.email}` : ""}
                  </p>
                </div>
                <OutcomeBadge outcome={entry.outcome} />
              </div>
              {entry.notes ? (
                <p className="text-xs text-muted-foreground">{entry.notes}</p>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {dateLabel(entry.call_date)} ·{" "}
                  {entry.employee?.full_name || entry.employee?.email || "—"}
                </p>
                {actions(entry)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Logged by</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <p className="text-sm font-medium">{entry.contact_name}</p>
                  {entry.business_name ? (
                    <p className="text-xs text-muted-foreground">
                      {entry.business_name}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.phone}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dateLabel(entry.call_date)}
                </TableCell>
                <TableCell>
                  <OutcomeBadge outcome={entry.outcome} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.employee?.full_name || entry.employee?.email || "—"}
                </TableCell>
                <TableCell className="max-w-56">
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.notes || "—"}
                  </p>
                </TableCell>
                <TableCell>{actions(entry)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this call entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `${deleting.contact_name} (${deleting.phone}) will be removed from the shared log. The team won't see this call anymore.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleting && remove(deleting)}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
