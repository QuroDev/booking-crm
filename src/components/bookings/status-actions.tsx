"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  UserX,
  XCircle,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteBooking,
  retryGoogleSync,
  setBookingStatus,
} from "@/actions/bookings";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Booking, BookingStatus } from "@/types/database";
import { RescheduleDialog } from "./reschedule-dialog";

export function StatusActions({
  booking,
  isAdmin,
  googleEventUrl,
}: {
  booking: Booking;
  isAdmin: boolean;
  googleEventUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);

  function changeStatus(status: BookingStatus, message: string) {
    startTransition(async () => {
      const result = await setBookingStatus(booking.id, status);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      if (result.warning) toast.warning(result.warning, { duration: 8000 });
      toast.success(message);
      router.refresh();
    });
  }

  function removeBooking() {
    startTransition(async () => {
      const result = await deleteBooking(booking.id);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      if (result.warning) toast.warning(result.warning, { duration: 8000 });
      toast.success("Booking deleted");
      router.push("/bookings");
      router.refresh();
    });
  }

  const active =
    booking.status === "booked" || booking.status === "rescheduled";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active ? (
        <Button
          size="sm"
          onClick={() => changeStatus("completed", "Marked as completed")}
          disabled={pending}
        >
          <CheckCircle2 className="size-4" /> Complete
        </Button>
      ) : null}
      <RescheduleDialog booking={booking} />
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/bookings/${booking.id}/edit`} />}
      >
        <Pencil className="size-4" /> Edit
      </Button>
      {googleEventUrl ? (
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={googleEventUrl} target="_blank" rel="noreferrer" />
          }
        >
          <ExternalLink className="size-4" /> Open in Google
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" aria-label="More actions" />}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreHorizontal className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {booking.status !== "no_show" ? (
            <DropdownMenuItem
              onClick={() => changeStatus("no_show", "Marked as no show")}
            >
              <UserX className="size-4" /> Mark as no show
            </DropdownMenuItem>
          ) : null}
          {booking.status !== "closed" ? (
            <DropdownMenuItem
              onClick={() => changeStatus("closed", "Marked as closed")}
            >
              <Archive className="size-4" /> Mark as closed
            </DropdownMenuItem>
          ) : null}
          {booking.status === "cancelled" ? (
            <DropdownMenuItem
              onClick={() => changeStatus("booked", "Booking re-opened")}
            >
              <RotateCcw className="size-4" /> Re-open booking
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirm("cancel")}
            >
              <XCircle className="size-4" /> Cancel booking
            </DropdownMenuItem>
          )}
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirm("delete")}
              >
                <Trash2 className="size-4" /> Delete booking
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? "Delete this booking?" : "Cancel this meeting?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete"
                ? "The booking and its history are permanently removed, and the Google Calendar event is deleted. This cannot be undone."
                : "The Google Calendar event is removed and the client is notified. The booking stays in the  as cancelled."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirm === "delete") removeBooking();
                else changeStatus("cancelled", "Booking cancelled");
                setConfirm(null);
              }}
            >
              {confirm === "delete" ? "Delete booking" : "Cancel meeting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function RetrySyncButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryGoogleSync(bookingId);
          if (!result.ok) toast.error(result.error ?? "Sync failed");
          else toast.success("Google Calendar synced");
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RotateCcw className="size-4" />
      )}
      Retry sync
    </Button>
  );
}
