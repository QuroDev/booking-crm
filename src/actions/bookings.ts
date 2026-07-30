"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  computeMeetingInstant,
  formatBookingLocal,
  InvalidMeetingTimeError,
} from "@/lib/datetime";
import {
  createBookingEvent,
  deleteBookingEvent,
  updateBookingEvent,
} from "@/lib/google/calendar";
import { GoogleNotConfiguredError } from "@/lib/google/oauth";
import {
  clearGoogleCredentials,
  GoogleNotConnectedError,
  isInvalidGrant,
} from "@/lib/google/tokens";
import { sendBookingNotification } from "@/lib/email/notifications";
import {
  bookingSchema,
  rescheduleSchema,
  type BookingFormValues,
} from "@/lib/validation/booking";
import type { Booking, BookingStatus } from "@/types/database";

export interface BookingActionResult {
  ok: boolean;
  error?: string;
  warning?: string;
  bookingId?: string;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

async function getEmployeeName(createdBy: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", createdBy)
    .single();
  return data?.full_name || data?.email || "Nouveau team";
}

/**
 * Pushes a booking to Google Calendar (create or update) and records the
 * outcome on the row. Never throws — the booking is already saved.
 */
async function syncBookingToGoogle(
  bookingId: string
): Promise<{ warning: string | null; booking: Booking | null }> {
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();

  if (!booking) return { warning: "Booking not found.", booking: null };

  const employeeName = await getEmployeeName(booking.created_by);

  try {
    const result = booking.google_event_id
      ? await updateBookingEvent(booking.google_event_id, booking, employeeName)
      : await createBookingEvent(booking, employeeName);

    const { data: updated } = await supabase
      .from("bookings")
      .update({
        google_event_id: result.eventId,
        meet_link: booking.call_type === "google_meet" ? result.meetLink : null,
        google_sync_status: "synced",
        google_sync_error: null,
      })
      .eq("id", bookingId)
      .select("*")
      .single<Booking>();

    return { warning: null, booking: updated ?? booking };
  } catch (error) {
    if (
      error instanceof GoogleNotConnectedError ||
      error instanceof GoogleNotConfiguredError
    ) {
      await supabase
        .from("bookings")
        .update({ google_sync_status: "skipped", google_sync_error: null })
        .eq("id", bookingId);
      return {
        warning:
          "Booking saved, but Google Calendar is not connected — no calendar event was created. Connect it from Settings.",
        booking,
      };
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    if (isInvalidGrant(error)) {
      await clearGoogleCredentials();
    }
    await supabase
      .from("bookings")
      .update({ google_sync_status: "failed", google_sync_error: message })
      .eq("id", bookingId);
    return {
      warning: isInvalidGrant(error)
        ? "Booking saved, but the Google Calendar connection expired. Reconnect it from Settings, then retry the sync."
        : `Booking saved, but the Google Calendar sync failed: ${message}. You can retry from the booking page.`,
      booking,
    };
  }
}

export async function createBooking(
  input: BookingFormValues
): Promise<BookingActionResult> {
  const profile = await requireProfile();

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const values = parsed.data;

  let instant;
  try {
    instant = computeMeetingInstant(
      values.meetingDate,
      values.meetingTime,
      values.timezone,
      values.durationMinutes
    );
  } catch (error) {
    if (error instanceof InvalidMeetingTimeError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      created_by: profile.id,
      first_name: values.firstName,
      last_name: values.lastName,
      business_name: values.businessName,
      email: values.email,
      phone: values.phone,
      whatsapp: values.whatsapp ?? null,
      city: values.city,
      country: values.country,
      client_timezone: values.timezone,
      meeting_date: values.meetingDate,
      meeting_time: values.meetingTime,
      duration_minutes: values.durationMinutes,
      start_time_utc: instant.startUtcISO,
      end_time_utc: instant.endUtcISO,
      call_type: values.callType,
      acquisition_method: values.acquisitionMethod,
      interests: values.interests,
      notes: values.notes ?? null,
      status: "booked",
      google_sync_status: "pending",
    })
    .select("*")
    .single<Booking>();

  if (error || !booking) {
    return { ok: false, error: error?.message ?? "Failed to save the booking." };
  }

  await supabase.from("booking_history").insert({
    booking_id: booking.id,
    action: "created",
    changed_by: profile.id,
    new_meeting_date: booking.meeting_date,
    new_meeting_time: booking.meeting_time,
    new_timezone: booking.client_timezone,
    new_start_utc: booking.start_time_utc,
    new_status: "booked",
  });

  const sync = await syncBookingToGoogle(booking.id);

  const emailWarning = await sendBookingNotification({
    kind: "created",
    booking: sync.booking ?? booking,
    employeeName: profile.full_name || profile.email,
  });

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");

  return {
    ok: true,
    bookingId: booking.id,
    warning: sync.warning ?? emailWarning ?? undefined,
  };
}

/** Edit page: everything except date/time/zone (those go through reschedule). */
export async function updateBooking(
  bookingId: string,
  input: BookingFormValues
): Promise<BookingActionResult> {
  const profile = await requireProfile();

  const parsed = bookingSchema
    .omit({ meetingDate: true, meetingTime: true, timezone: true })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const values = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();
  if (!existing) return { ok: false, error: "Booking not found." };

  // Duration may have changed: recompute the end instant from the stored
  // wall-clock meeting in its original timezone.
  let instant;
  try {
    instant = computeMeetingInstant(
      existing.meeting_date,
      existing.meeting_time.slice(0, 5),
      existing.client_timezone,
      values.durationMinutes
    );
  } catch (error) {
    if (error instanceof InvalidMeetingTimeError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const { data: updated, error } = await supabase
    .from("bookings")
    .update({
      first_name: values.firstName,
      last_name: values.lastName,
      business_name: values.businessName,
      email: values.email,
      phone: values.phone,
      whatsapp: values.whatsapp ?? null,
      city: values.city,
      country: values.country,
      duration_minutes: values.durationMinutes,
      end_time_utc: instant.endUtcISO,
      call_type: values.callType,
      acquisition_method: values.acquisitionMethod,
      interests: values.interests,
      notes: values.notes ?? null,
      google_sync_status:
        existing.google_sync_status === "synced"
          ? "pending"
          : existing.google_sync_status,
    })
    .eq("id", bookingId)
    .select("*")
    .single<Booking>();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Failed to update the booking." };
  }

  await supabase.from("booking_history").insert({
    booking_id: bookingId,
    action: "edited",
    changed_by: profile.id,
    details: { fields: changedFields(existing, updated) },
  });

  const sync = existing.google_event_id
    ? await syncBookingToGoogle(bookingId)
    : { warning: null };

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);

  return { ok: true, bookingId, warning: sync.warning ?? undefined };
}

function changedFields(prev: Booking, next: Booking): string[] {
  const keys: (keyof Booking)[] = [
    "first_name",
    "last_name",
    "business_name",
    "email",
    "phone",
    "whatsapp",
    "city",
    "country",
    "duration_minutes",
    "call_type",
    "acquisition_method",
    "notes",
  ];
  return keys.filter(
    (key) => JSON.stringify(prev[key]) !== JSON.stringify(next[key])
  );
}

export async function rescheduleBooking(
  bookingId: string,
  input: { meetingDate: string; meetingTime: string; timezone: string }
): Promise<BookingActionResult> {
  const profile = await requireProfile();

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();
  if (!existing) return { ok: false, error: "Booking not found." };

  let instant;
  try {
    instant = computeMeetingInstant(
      parsed.data.meetingDate,
      parsed.data.meetingTime,
      parsed.data.timezone,
      existing.duration_minutes
    );
  } catch (error) {
    if (error instanceof InvalidMeetingTimeError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }

  const previousMeetingLabel = formatBookingLocal(existing);

  // Atomic: snapshots the old meeting into history + updates the row.
  const { error } = await supabase.rpc("reschedule_booking", {
    p_booking_id: bookingId,
    p_new_date: parsed.data.meetingDate,
    p_new_time: parsed.data.meetingTime,
    p_new_timezone: parsed.data.timezone,
    p_new_start_utc: instant.startUtcISO,
    p_new_end_utc: instant.endUtcISO,
  });
  if (error) return { ok: false, error: error.message };

  const sync = await syncBookingToGoogle(bookingId);

  const emailWarning = sync.booking
    ? await sendBookingNotification({
        kind: "rescheduled",
        booking: sync.booking,
        employeeName: profile.full_name || profile.email,
        previousMeetingLabel,
      })
    : null;

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");

  return { ok: true, bookingId, warning: sync.warning ?? emailWarning ?? undefined };
}

export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<BookingActionResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single<Booking>();
  if (!existing) return { ok: false, error: "Booking not found." };
  if (existing.status === status) return { ok: true, bookingId };

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("booking_history").insert({
    booking_id: bookingId,
    action: "status_changed",
    changed_by: profile.id,
    prev_status: existing.status,
    new_status: status,
  });

  let warning: string | undefined;

  // Cancelling removes the calendar event and notifies attendees.
  if (status === "cancelled") {
    if (existing.google_event_id) {
      try {
        await deleteBookingEvent(existing.google_event_id);
        await supabase
          .from("bookings")
          .update({
            google_event_id: null,
            meet_link: null,
            google_sync_status: "skipped",
            google_sync_error: null,
          })
          .eq("id", bookingId);
      } catch (error) {
        warning = `Status updated, but removing the Google Calendar event failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`;
      }
    }
    await sendBookingNotification({
      kind: "cancelled",
      booking: { ...existing, status },
      employeeName: profile.full_name || profile.email,
    });
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");

  return { ok: true, bookingId, warning };
}

export async function deleteBooking(
  bookingId: string
): Promise<BookingActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, error: "Only admins can delete bookings." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, google_event_id")
    .eq("id", bookingId)
    .single();
  if (!existing) return { ok: false, error: "Booking not found." };

  let warning: string | undefined;
  if (existing.google_event_id) {
    try {
      await deleteBookingEvent(existing.google_event_id);
    } catch (error) {
      warning = `Booking deleted, but removing the Google Calendar event failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`;
    }
  }

  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");

  return { ok: true, warning };
}

export async function retryGoogleSync(
  bookingId: string
): Promise<BookingActionResult> {
  await requireProfile();
  const sync = await syncBookingToGoogle(bookingId);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  if (sync.warning) return { ok: false, error: sync.warning };
  return { ok: true, bookingId };
}
