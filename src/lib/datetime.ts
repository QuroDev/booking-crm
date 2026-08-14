import { DateTime, IANAZone } from "luxon";

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
  startUtcISO: string;
  endUtcISO: string;
  startLocalISO: string;
  endLocalISO: string;
  zone: string;
}

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

export function formatUtcInZone(
  utcISO: string,
  zone: string,
  fmt = "ccc, LLL d yyyy · h:mm a (ZZZZ)"
): string {
  const dt = DateTime.fromISO(utcISO, { zone: "utc" }).setZone(zone);
  return dt.isValid ? dt.toFormat(fmt) : "—";
}

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

export function todayInZone(zone: string): string {
  const dt = DateTime.now().setZone(isValidIanaZone(zone) ? zone : "utc");
  return dt.toISODate()!;
}

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
