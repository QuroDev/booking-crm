import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { businessZone } from "./stats";

/**
 * Per-employee call tracking. Relies on RLS for scoping: admins see every
 * employee and booking, employees automatically get only their own numbers.
 */

export type TrackerRange = "week" | "month" | "all";

export interface EmployeeCallStats {
  employeeId: string;
  name: string;
  email: string;
  isActive: boolean;
  /** Bookings whose meeting falls inside the range. */
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  /** completed / finished-outcome meetings (completed+cancelled+no_show+closed). */
  completionRate: number | null;
  /** Next upcoming call start (UTC ISO), if any — looked up range-independent. */
  nextCallUtc: string | null;
}

export interface CallTrackerData {
  range: TrackerRange;
  fromISO: string | null;
  stats: EmployeeCallStats[];
  team: {
    total: number;
    upcoming: number;
    completed: number;
    noShow: number;
    cancelled: number;
  };
}

export function rangeBounds(
  range: TrackerRange
): { from: DateTime; to: DateTime } | null {
  const now = DateTime.now().setZone(businessZone());
  if (range === "week") return { from: now.startOf("week"), to: now.endOf("week") };
  if (range === "month") return { from: now.startOf("month"), to: now.endOf("month") };
  return null;
}

export async function getCallTracker(
  range: TrackerRange
): Promise<CallTrackerData> {
  const supabase = await createClient();
  const bounds = rangeBounds(range);
  const nowISO = new Date().toISOString();

  let bookingsQuery = supabase
    .from("bookings")
    .select("created_by, status, start_time_utc");
  if (bounds) {
    bookingsQuery = bookingsQuery
      .gte("start_time_utc", bounds.from.toUTC().toISO()!)
      .lte("start_time_utc", bounds.to.toUTC().toISO()!);
  }

  const [profilesRes, bookingsRes, nextCallsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, is_active")
      .order("full_name"),
    bookingsQuery,
    supabase
      .from("bookings")
      .select("created_by, start_time_utc")
      .gt("start_time_utc", nowISO)
      .in("status", ["booked", "rescheduled"])
      .order("start_time_utc", { ascending: true }),
  ]);

  const profiles = profilesRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const nextCalls = new Map<string, string>();
  for (const row of nextCallsRes.data ?? []) {
    if (!nextCalls.has(row.created_by)) {
      nextCalls.set(row.created_by, row.start_time_utc);
    }
  }

  const stats: EmployeeCallStats[] = profiles.map((profile) => {
    const mine = bookings.filter((b) => b.created_by === profile.id);
    const count = (status: string) =>
      mine.filter((b) => b.status === status).length;

    const completed = count("completed");
    const cancelled = count("cancelled");
    const noShow = count("no_show");
    const closed = count("closed");
    const upcoming = mine.filter(
      (b) =>
        (b.status === "booked" || b.status === "rescheduled") &&
        b.start_time_utc > nowISO
    ).length;
    const finished = completed + cancelled + noShow + closed;

    return {
      employeeId: profile.id,
      name: profile.full_name || profile.email,
      email: profile.email,
      isActive: profile.is_active,
      total: mine.length,
      upcoming,
      completed,
      cancelled,
      noShow,
      rescheduled: count("rescheduled"),
      completionRate: finished > 0 ? completed / finished : null,
      nextCallUtc: nextCalls.get(profile.id) ?? null,
    };
  });

  stats.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return {
    range,
    fromISO: bounds?.from.toISODate() ?? null,
    stats,
    team: {
      total: stats.reduce((sum, s) => sum + s.total, 0),
      upcoming: stats.reduce((sum, s) => sum + s.upcoming, 0),
      completed: stats.reduce((sum, s) => sum + s.completed, 0),
      noShow: stats.reduce((sum, s) => sum + s.noShow, 0),
      cancelled: stats.reduce((sum, s) => sum + s.cancelled, 0),
    },
  };
}
