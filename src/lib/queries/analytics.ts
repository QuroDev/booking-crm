import { createClient } from "@/lib/supabase/server";

export interface AnalyticsData {
  byWeek: { week_start: string; total: number }[];
  byMonth: { month_start: string; total: number }[];
  byEmployee: {
    employee_id: string;
    employee_name: string;
    total: number;
    completed: number;
  }[];
  byCallType: { call_type: string; total: number }[];
  outcomes: { status: string; total: number }[];
  byInterest: { interest: string; total: number }[];
}

export async function getAnalytics(
  fromISO: string,
  toISO: string
): Promise<AnalyticsData> {
  const supabase = await createClient();
  const args = { p_from: fromISO, p_to: toISO };

  const [byWeek, byMonth, byEmployee, byCallType, outcomes, byInterest] =
    await Promise.all([
      supabase.rpc("bookings_by_week", args),
      supabase.rpc("bookings_by_month", args),
      supabase.rpc("bookings_by_employee", args),
      supabase.rpc("bookings_by_call_type", args),
      supabase.rpc("booking_outcome_counts", args),
      supabase.rpc("bookings_by_interest", args),
    ]);

  return {
    byWeek: byWeek.data ?? [],
    byMonth: byMonth.data ?? [],
    byEmployee: byEmployee.data ?? [],
    byCallType: byCallType.data ?? [],
    outcomes: outcomes.data ?? [],
    byInterest: byInterest.data ?? [],
  };
}
