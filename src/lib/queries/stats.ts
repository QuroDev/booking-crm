import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";

/**
 * "Today" / "this month" boundaries are computed in the business timezone
 * (where Qais reviews the dashboard), not the server's.
 */
export function businessZone(): string {
  return process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE || "America/New_York";
}

export interface DashboardStats {
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;
  monthCount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const zone = businessZone();
  const now = DateTime.now().setZone(zone);
  const dayStart = now.startOf("day").toUTC().toISO()!;
  const dayEnd = now.endOf("day").toUTC().toISO()!;
  const monthStart = now.startOf("month").toUTC().toISO()!;
  const monthEnd = now.endOf("month").toUTC().toISO()!;
  const nowISO = now.toUTC().toISO()!;

  const head = { count: "exact" as const, head: true };

  const [today, upcoming, completed, cancelled, month] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", head)
      .gte("start_time_utc", dayStart)
      .lte("start_time_utc", dayEnd)
      .neq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("id", head)
      .gt("start_time_utc", nowISO)
      .in("status", ["booked", "rescheduled"]),
    supabase.from("bookings").select("id", head).eq("status", "completed"),
    supabase.from("bookings").select("id", head).eq("status", "cancelled"),
    supabase
      .from("bookings")
      .select("id", head)
      .gte("created_at", monthStart)
      .lte("created_at", monthEnd),
  ]);

  return {
    todayCount: today.count ?? 0,
    upcomingCount: upcoming.count ?? 0,
    completedCount: completed.count ?? 0,
    cancelledCount: cancelled.count ?? 0,
    monthCount: month.count ?? 0,
  };
}
