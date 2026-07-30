import { createClient } from "@/lib/supabase/server";
import type { CallLogEntryWithEmployee } from "@/types/database";

/** Shared team call log — RLS lets every signed-in employee read all of it. */
export async function listCallLog(
  q?: string,
  limit = 200
): Promise<CallLogEntryWithEmployee[]> {
  const supabase = await createClient();
  let query = supabase
    .from("call_log")
    .select("*, employee:profiles!call_log_logged_by_fkey(id, email, full_name)")
    .order("call_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q) {
    const clean = q.replace(/[,()%]/g, " ").trim();
    if (clean) {
      const pattern = `%${clean}%`;
      query = query.or(
        [
          `contact_name.ilike.${pattern}`,
          `business_name.ilike.${pattern}`,
          `phone.ilike.${pattern}`,
          `email.ilike.${pattern}`,
        ].join(",")
      );
    }
  }

  const { data } = await query;
  return (data as unknown as CallLogEntryWithEmployee[]) ?? [];
}
