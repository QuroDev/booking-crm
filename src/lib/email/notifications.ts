import "server-only";

import { Resend } from "resend";
import { formatBookingLocal } from "@/lib/datetime";
import { callTypeLabel } from "@/lib/constants";
import { isResendConfigured } from "@/lib/env";
import type { Booking } from "@/types/database";

/**
 * Notification layer. Email today; the NotificationEvent shape is the seam
 * for future channels (SMS / WhatsApp / Slack): add another sender that
 * consumes the same event.
 */

export interface NotificationEvent {
  kind: "created" | "rescheduled" | "cancelled";
  booking: Booking;
  employeeName: string;
  /** For reschedules: the previous meeting, already formatted for display. */
  previousMeetingLabel?: string;
}

const SUBJECTS: Record<NotificationEvent["kind"], (b: Booking) => string> = {
  created: (b) =>
    `New strategy call — ${b.business_name} (${b.first_name} ${b.last_name})`,
  rescheduled: (b) =>
    `Rescheduled — ${b.business_name} (${b.first_name} ${b.last_name})`,
  cancelled: (b) =>
    `Cancelled — ${b.business_name} (${b.first_name} ${b.last_name})`,
};

function row(label: string, value: string | null | undefined): string {
  return `<tr>
    <td style="padding:6px 16px 6px 0;color:#8b8b95;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#f4f4f6;font-size:13px;">${value || "—"}</td>
  </tr>`;
}

function buildHtml(event: NotificationEvent): string {
  const { booking, employeeName } = event;
  const heading =
    event.kind === "created"
      ? "New booking"
      : event.kind === "rescheduled"
        ? "Booking rescheduled"
        : "Booking cancelled";

  const meetingLabel = formatBookingLocal(booking);

  return `
  <div style="background:#0d0d10;padding:32px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#17171b;border:1px solid #26262c;border-radius:14px;padding:28px;">
      <p style="margin:0 0 4px;color:#8b8b95;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Nouveau Booking</p>
      <h1 style="margin:0 0 20px;color:#f4f4f6;font-size:20px;">${heading}</h1>
      ${
        event.previousMeetingLabel
          ? `<p style="margin:0 0 16px;color:#e2b93b;font-size:13px;">Moved from: ${event.previousMeetingLabel}<br/>New time: ${meetingLabel}</p>`
          : ""
      }
      <table style="border-collapse:collapse;width:100%;">
        ${row("Client", `${booking.first_name} ${booking.last_name}`)}
        ${row("Business", booking.business_name)}
        ${row("Meeting", meetingLabel)}
        ${row("Time Zone", booking.client_timezone)}
        ${row("Call Type", callTypeLabel(booking.call_type))}
        ${booking.meet_link ? row("Google Meet", `<a href="${booking.meet_link}" style="color:#8f8bff;">${booking.meet_link}</a>`) : ""}
        ${row("Email", booking.email)}
        ${row("Phone", booking.phone)}
        ${row("WhatsApp", booking.whatsapp)}
        ${row("City", `${booking.city}, ${booking.country}`)}
        ${row("Main Interest", booking.interests.join(", "))}
        ${row("How They Get Customers", booking.acquisition_method)}
        ${row("Booked by", employeeName)}
        ${row("Notes", booking.notes)}
      </table>
    </div>
  </div>`;
}

/**
 * Fire-and-forget: never throws, never blocks a booking from saving.
 * Returns a warning string when sending was skipped or failed.
 */
export async function sendBookingNotification(
  event: NotificationEvent
): Promise<string | null> {
  if (!isResendConfigured()) {
    return "Email notification skipped (Resend is not configured).";
  }
  const to = process.env.NOTIFY_EMAIL ?? "jaydxn413@gmail.com";
  const from = process.env.EMAIL_FROM ?? "Nouveau Booking <onboarding@resend.dev>";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: SUBJECTS[event.kind](event.booking),
      html: buildHtml(event),
    });
    if (error) return `Email notification failed: ${error.message}`;
    return null;
  } catch (error) {
    return `Email notification failed: ${error instanceof Error ? error.message : "unknown error"}`;
  }
}
