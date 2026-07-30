import { createClient } from "@/lib/supabase/server";
import type {
  Booking,
  BookingHistoryWithActor,
  BookingWithEmployee,
} from "@/types/database";

const WITH_EMPLOYEE =
  "*, employee:profiles!bookings_created_by_fkey(id, email, full_name)";

export interface BookingFilters {
  q?: string;
  status?: string;
  employeeId?: string;
  callType?: string;
  /** Inclusive local meeting_date bounds (YYYY-MM-DD). */
  from?: string;
  to?: string;
}

/** PostgREST .or() treats , ( ) as syntax — strip them from user input. */
function sanitizeSearch(q: string): string {
  return q.replace(/[,()]/g, " ").trim();
}

export async function listBookings(
  filters: BookingFilters,
  limit = 100
): Promise<BookingWithEmployee[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(WITH_EMPLOYEE)
    .order("start_time_utc", { ascending: false })
    .limit(limit);

  if (filters.q) {
    const q = sanitizeSearch(filters.q);
    if (q) {
      const pattern = `%${q}%`;
      query = query.or(
        [
          `first_name.ilike.${pattern}`,
          `last_name.ilike.${pattern}`,
          `business_name.ilike.${pattern}`,
          `email.ilike.${pattern}`,
          `phone.ilike.${pattern}`,
          `city.ilike.${pattern}`,
        ].join(",")
      );
    }
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.employeeId) query = query.eq("created_by", filters.employeeId);
  if (filters.callType) query = query.eq("call_type", filters.callType);
  if (filters.from) query = query.gte("meeting_date", filters.from);
  if (filters.to) query = query.lte("meeting_date", filters.to);

  const { data } = await query;
  return (data as unknown as BookingWithEmployee[]) ?? [];
}

export async function getBooking(
  id: string
): Promise<BookingWithEmployee | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(WITH_EMPLOYEE)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as BookingWithEmployee) ?? null;
}

export async function getBookingHistory(
  bookingId: string
): Promise<BookingHistoryWithActor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_history")
    .select(
      "*, actor:profiles!booking_history_changed_by_fkey(id, email, full_name)"
    )
    .eq("booking_id", bookingId)
    .order("changed_at", { ascending: false });
  return (data as unknown as BookingHistoryWithActor[]) ?? [];
}

/** Repeat-client detection: other bookings sharing the client's email. */
export async function getClientHistory(
  email: string,
  excludeBookingId?: string
): Promise<Booking[]> {
  if (!email) return [];
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*")
    .ilike("email", email.replace(/[%_]/g, "\\$&"))
    .order("start_time_utc", { ascending: false })
    .limit(10);
  if (excludeBookingId) query = query.neq("id", excludeBookingId);
  const { data } = await query;
  return (data as Booking[]) ?? [];
}

/** Bookings whose start instant falls inside a UTC range (calendar views). */
export async function listBookingsInRange(
  startUtcISO: string,
  endUtcISO: string,
  filters: Pick<BookingFilters, "status" | "employeeId" | "callType"> = {}
): Promise<BookingWithEmployee[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(WITH_EMPLOYEE)
    .gte("start_time_utc", startUtcISO)
    .lte("start_time_utc", endUtcISO)
    .order("start_time_utc", { ascending: true });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.employeeId) query = query.eq("created_by", filters.employeeId);
  if (filters.callType) query = query.eq("call_type", filters.callType);

  const { data } = await query;
  return (data as unknown as BookingWithEmployee[]) ?? [];
}

/** Next upcoming calls (dashboard). */
export async function getUpcomingBookings(
  limit = 5
): Promise<BookingWithEmployee[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(WITH_EMPLOYEE)
    .gt("start_time_utc", new Date().toISOString())
    .in("status", ["booked", "rescheduled"])
    .order("start_time_utc", { ascending: true })
    .limit(limit);
  return (data as unknown as BookingWithEmployee[]) ?? [];
}

export type ActivityEntry = BookingHistoryWithActor & {
  booking: {
    id: string;
    first_name: string;
    last_name: string;
    business_name: string;
  } | null;
};

/** Latest history entries across visible bookings (dashboard activity feed). */
export async function getRecentActivity(limit = 8): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_history")
    .select(
      "*, actor:profiles!booking_history_changed_by_fkey(id, email, full_name), booking:bookings(id, first_name, last_name, business_name)"
    )
    .order("changed_at", { ascending: false })
    .limit(limit);
  return (data as unknown as ActivityEntry[]) ?? [];
}

export async function listEmployeesForFilter(): Promise<
  { id: string; label: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .order("full_name");
  return (
    data?.map((p) => ({ id: p.id, label: p.full_name || p.email })) ?? []
  );
}
