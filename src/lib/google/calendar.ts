import "server-only";

import type { calendar_v3 } from "googleapis";
import { computeMeetingInstant } from "@/lib/datetime";
import { callTypeLabel } from "@/lib/constants";
import type { Booking } from "@/types/database";
import { getAuthorizedCalendar } from "./tokens";

/**
 * Both admins are invited to every event, so it lands on both of their
 * calendars regardless of which account holds the Google connection.
 */
const TEAM_ATTENDEES = [
  "qaisnaveed2008@gmail.com",
  "jaydxn413@gmail.com",
];

export interface SyncResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

/**
 * Builds the full Google event body from a booking row. The event carries the
 * offset-qualified local dateTime AND the IANA timeZone, so it lands on the
 * correct instant and renders correctly for every attendee.
 */
function buildEventBody(
  booking: Booking,
  employeeName: string
): calendar_v3.Schema$Event {
  const instant = computeMeetingInstant(
    booking.meeting_date,
    booking.meeting_time.slice(0, 5),
    booking.client_timezone,
    booking.duration_minutes
  );

  const clientName = `${booking.first_name} ${booking.last_name}`;

  const attendees: calendar_v3.Schema$EventAttendee[] = [
    { email: booking.email, displayName: clientName },
    ...TEAM_ATTENDEES.filter(
      (email) => email.toLowerCase() !== booking.email.toLowerCase()
    ).map((email) => ({ email })),
  ];

  const event: calendar_v3.Schema$Event = {
    summary: `Nouveau Strategy Call – ${booking.business_name} – ${clientName}`,
    description: buildEventDescription(booking, employeeName),
    start: { dateTime: instant.startLocalISO, timeZone: instant.zone },
    end: { dateTime: instant.endLocalISO, timeZone: instant.zone },
    attendees,
  };

  const location = buildEventLocation(booking);
  if (location) event.location = location;

  return event;
}

export function buildEventLocation(booking: Booking): string | null {
  switch (booking.call_type) {
    case "phone":
      return `Phone Call – Qais & Jayden will call ${booking.phone}`;
    case "facetime":
      return `FaceTime – Qais & Jayden will FaceTime ${booking.phone}`;
    case "whatsapp":
      return `WhatsApp Call – ${booking.whatsapp || booking.phone}`;
    default:
      return null; // Google Meet: conference data carries the location
  }
}

export function buildEventDescription(
  booking: Booking,
  employeeName: string
): string {
  const lines = [
    `Booked by: ${employeeName}`,
    `Business: ${booking.business_name}`,
    `Contact: ${booking.first_name} ${booking.last_name}`,
    `Phone: ${booking.phone}`,
    `WhatsApp: ${booking.whatsapp || "—"}`,
    `Email: ${booking.email}`,
    `City: ${booking.city}`,
    `Country: ${booking.country}`,
    `Time Zone: ${booking.client_timezone}`,
    `Call Type: ${callTypeLabel(booking.call_type)}`,
    `How They Get Customers: ${booking.acquisition_method ?? "—"}`,
    `Main Interest: ${booking.interests.join(", ") || "—"}`,
    `Notes: ${booking.notes || "—"}`,
  ];
  return lines.join("\n");
}

function extractMeetLink(event: calendar_v3.Schema$Event): string | null {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video"
    )?.uri ??
    null
  );
}

export async function createBookingEvent(
  booking: Booking,
  employeeName: string
): Promise<SyncResult> {
  const calendar = await getAuthorizedCalendar();
  const body = buildEventBody(booking, employeeName);

  if (booking.call_type === "google_meet") {
    body.conferenceData = {
      createRequest: {
        requestId: booking.id, // unique per booking
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1, // required or conferenceData is ignored
    requestBody: body,
  });

  return {
    eventId: response.data.id!,
    meetLink: extractMeetLink(response.data),
    htmlLink: response.data.htmlLink ?? null,
  };
}

/** Full update of an existing event (reschedules + detail edits). */
export async function updateBookingEvent(
  eventId: string,
  booking: Booking,
  employeeName: string
): Promise<SyncResult> {
  const calendar = await getAuthorizedCalendar();
  const body = buildEventBody(booking, employeeName);

  const response = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: body,
  });

  return {
    eventId: response.data.id ?? eventId,
    meetLink: extractMeetLink(response.data),
    htmlLink: response.data.htmlLink ?? null,
  };
}

export async function deleteBookingEvent(eventId: string): Promise<void> {
  const calendar = await getAuthorizedCalendar();
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
  } catch (error) {
    // Already deleted on Google's side — treat as success.
    const status = (error as { code?: number; status?: number }).code ??
      (error as { status?: number }).status;
    if (status === 404 || status === 410) return;
    throw error;
  }
}
