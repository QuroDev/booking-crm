import { DateTime, IANAZone } from "luxon";

/**
 * Timezone correctness core.
 *
 * Rules this module enforces across the whole app:
 * - Date/time values cross the client → server boundary ONLY as strings
 *   ('2026-07-10', '15:00', 'America/Los_Angeles'). Never as Date objects.
 * - The selected wall-clock time is interpreted IN the selected IANA zone —
 *   never in server time, never as UTC.
 * - All conversion goes through computeMeetingInstant(); DST is handled by
 *   Luxon, never by manual offset math.
 */

export class InvalidMeetingTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMeetingTimeError";
  }
}

export function isValidIanaZone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

export interface MeetingInstant {
  /** UTC instant, e.g. '2026-07-10T22:00:00.000Z' → bookings.start_time_utc */
  startUtcISO: string;
  endUtcISO: string;
  /** Offset-qualified local time, e.g. '2026-07-10T15:00:00-07:00' → Google dateTime */
  startLocalISO: string;
  endLocalISO: string;
  /** The IANA zone, echoed back → Google timeZone field + bookings.client_timezone */
  zone: string;
}

/**
 * THE conversion. Interprets `dateISO` + `time24` in `zone` and derives the
 * exact UTC instants for storage plus offset-qualified local ISO strings for
 * the Google Calendar API.
 *
 * @param dateISO 'YYYY-MM-DD' (from <input type="date">)
 * @param time24  'HH:mm'      (from <input type="time">)
 * @param zone    IANA identifier, e.g. 'America/Los_Angeles'
 */
export function computeMeetingInstant(
  dateISO: string,
  time24: string,
  zone: string,
  durationMinutes: number
): MeetingInstant {
  if (!IANAZone.isValidZone(zone)) {
    throw new InvalidMeetingTimeError(`Invalid timezone: ${zone}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    throw new InvalidMeetingTimeError(`Invalid date: ${dateISO}`);
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time24)) {
    throw new InvalidMeetingTimeError(`Invalid time: ${time24}`);
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new InvalidMeetingTimeError(`Invalid duration: ${durationMinutes}`);
  }

  const hhmm = time24.slice(0, 5);
  const start = DateTime.fromISO(`${dateISO}T${hhmm}`, { zone });
  if (!start.isValid) {
    throw new InvalidMeetingTimeError(
      start.invalidReason ?? "Invalid date/time"
    );
  }

  // Luxon resolves nonexistent local times (DST spring-forward gap) by
  // shifting forward; detect and reject so the user picks a real time.
  if (start.hour !== Number(hhmm.slice(0, 2)) || start.minute !== Number(hhmm.slice(3, 5))) {
    throw new InvalidMeetingTimeError(
      `${hhmm} does not exist on ${dateISO} in ${zone} (daylight saving change). Pick a different time.`
    );
  }

  const end = start.plus({ minutes: durationMinutes });

  return {
    startUtcISO: start.toUTC().toISO()!,
    endUtcISO: end.toUTC().toISO()!,
    startLocalISO: start.toISO({ suppressMilliseconds: true })!,
    endLocalISO: end.toISO({ suppressMilliseconds: true })!,
    zone,
  };
}

/** Timezone dropdown options, grouped-friendly labels with current UTC offset. */
export function getTimezoneOptions(): { value: string; label: string }[] {
  const zones: string[] =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : COMMON_ZONES;

  return zones.map((zone) => {
    const offset = DateTime.now().setZone(zone).toFormat("ZZ");
    return { value: zone, label: `${zone.replaceAll("_", " ")} (UTC${offset})` };
  });
}

/** Renders a stored UTC instant in an explicit zone — never the ambient TZ. */
export function formatUtcInZone(
  utcISO: string,
  zone: string,
  fmt = "ccc, LLL d yyyy · h:mm a (ZZZZ)"
): string {
  const dt = DateTime.fromISO(utcISO, { zone: "utc" }).setZone(zone);
  return dt.isValid ? dt.toFormat(fmt) : "—";
}

/** "3:00 PM · America/Los Angeles" from the stored local fields. */
export function formatBookingLocal(booking: {
  meeting_date: string;
  meeting_time: string;
  client_timezone: string;
}): string {
  const hhmm = booking.meeting_time.slice(0, 5);
  const dt = DateTime.fromISO(`${booking.meeting_date}T${hhmm}`, {
    zone: booking.client_timezone,
  });
  if (!dt.isValid) return `${booking.meeting_date} ${hhmm}`;
  return dt.toFormat("ccc, LLL d yyyy · h:mm a") + ` (${zoneAbbreviation(dt)})`;
}

function zoneAbbreviation(dt: DateTime): string {
  return dt.toFormat("ZZZZ");
}

/** Today's date string in a given zone (for date input min/defaults). */
export function todayInZone(zone: string): string {
  const dt = DateTime.now().setZone(isValidIanaZone(zone) ? zone : "utc");
  return dt.toISODate()!;
}

/** Fallback list for very old runtimes without Intl.supportedValuesOf. */
const COMMON_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "UTC",
];
