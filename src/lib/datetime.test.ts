import { describe, expect, it } from "vitest";
import {
  computeMeetingInstant,
  formatUtcInZone,
  InvalidMeetingTimeError,
  isValidIanaZone,
} from "./datetime";

/**
 * These tests are TZ-independent: Luxon interprets wall-clock time in the
 * given IANA zone regardless of the machine's timezone. If any of them fail,
 * Google Calendar events WILL be created at the wrong time.
 */
describe("computeMeetingInstant", () => {
  it("converts 3:00 PM America/Los_Angeles (PDT, summer) to 22:00 UTC — the spec example", () => {
    const result = computeMeetingInstant("2026-07-10", "15:00", "America/Los_Angeles", 60);
    expect(result.startUtcISO).toBe("2026-07-10T22:00:00.000Z");
    expect(result.endUtcISO).toBe("2026-07-10T23:00:00.000Z");
    expect(result.startLocalISO).toBe("2026-07-10T15:00:00-07:00");
    expect(result.endLocalISO).toBe("2026-07-10T16:00:00-07:00");
    expect(result.zone).toBe("America/Los_Angeles");
  });

  it("converts 3:00 PM America/Los_Angeles (PST, winter) to 23:00 UTC — DST-aware", () => {
    const result = computeMeetingInstant("2026-12-10", "15:00", "America/Los_Angeles", 60);
    expect(result.startUtcISO).toBe("2026-12-10T23:00:00.000Z");
    expect(result.startLocalISO).toBe("2026-12-10T15:00:00-08:00");
  });

  it("handles America/New_York", () => {
    const result = computeMeetingInstant("2026-07-10", "09:30", "America/New_York", 45);
    expect(result.startUtcISO).toBe("2026-07-10T13:30:00.000Z");
    expect(result.endUtcISO).toBe("2026-07-10T14:15:00.000Z");
  });

  it("handles Europe/London (BST in summer)", () => {
    const result = computeMeetingInstant("2026-07-10", "15:00", "Europe/London", 60);
    expect(result.startUtcISO).toBe("2026-07-10T14:00:00.000Z");
  });

  it("handles southern-hemisphere DST (Australia/Sydney: AEST in July, AEDT in January)", () => {
    const winter = computeMeetingInstant("2026-07-10", "10:00", "Australia/Sydney", 60);
    expect(winter.startUtcISO).toBe("2026-07-10T00:00:00.000Z"); // UTC+10

    const summer = computeMeetingInstant("2026-01-10", "10:00", "Australia/Sydney", 60);
    expect(summer.startUtcISO).toBe("2026-01-09T23:00:00.000Z"); // UTC+11
  });

  it("handles half-hour offset zones (Asia/Kolkata, UTC+5:30)", () => {
    const result = computeMeetingInstant("2026-07-10", "15:00", "Asia/Kolkata", 60);
    expect(result.startUtcISO).toBe("2026-07-10T09:30:00.000Z");
  });

  it("handles Asia/Karachi (UTC+5, no DST)", () => {
    const result = computeMeetingInstant("2026-07-10", "15:00", "Asia/Karachi", 60);
    expect(result.startUtcISO).toBe("2026-07-10T10:00:00.000Z");
  });

  it("crosses midnight into the next UTC day correctly", () => {
    const result = computeMeetingInstant("2026-07-10", "23:30", "America/Los_Angeles", 60);
    expect(result.startUtcISO).toBe("2026-07-11T06:30:00.000Z");
    expect(result.endUtcISO).toBe("2026-07-11T07:30:00.000Z");
  });

  it("accepts HH:mm:ss input (Postgres time round-trip)", () => {
    const result = computeMeetingInstant("2026-07-10", "15:00:00", "America/Los_Angeles", 60);
    expect(result.startUtcISO).toBe("2026-07-10T22:00:00.000Z");
  });

  it("rejects the DST spring-forward gap (2:30 AM doesn't exist on 2026-03-08 in New York)", () => {
    expect(() =>
      computeMeetingInstant("2026-03-08", "02:30", "America/New_York", 60)
    ).toThrow(InvalidMeetingTimeError);
  });

  it("rejects invalid zones", () => {
    expect(() =>
      computeMeetingInstant("2026-07-10", "15:00", "Mars/Olympus_Mons", 60)
    ).toThrow(InvalidMeetingTimeError);
    expect(() =>
      computeMeetingInstant("2026-07-10", "15:00", "", 60)
    ).toThrow(InvalidMeetingTimeError);
  });

  it("rejects malformed dates, times, and durations", () => {
    expect(() =>
      computeMeetingInstant("07/10/2026", "15:00", "America/Los_Angeles", 60)
    ).toThrow(InvalidMeetingTimeError);
    expect(() =>
      computeMeetingInstant("2026-07-10", "3pm", "America/Los_Angeles", 60)
    ).toThrow(InvalidMeetingTimeError);
    expect(() =>
      computeMeetingInstant("2026-02-31", "15:00", "America/Los_Angeles", 60)
    ).toThrow(InvalidMeetingTimeError);
    expect(() =>
      computeMeetingInstant("2026-07-10", "15:00", "America/Los_Angeles", 0)
    ).toThrow(InvalidMeetingTimeError);
  });
});

describe("formatUtcInZone", () => {
  it("renders a stored UTC instant back in the client's zone", () => {
    const label = formatUtcInZone(
      "2026-07-10T22:00:00.000Z",
      "America/Los_Angeles",
      "h:mm a"
    );
    expect(label).toBe("3:00 PM");
  });
});

describe("isValidIanaZone", () => {
  it("accepts IANA identifiers and rejects garbage", () => {
    expect(isValidIanaZone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaZone("Europe/London")).toBe(true);
    expect(isValidIanaZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidIanaZone("")).toBe(false);
  });
});
