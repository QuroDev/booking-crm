"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CallLogEntry } from "@/types/database";

export interface CallLogActionResult {
  ok: boolean;
  error?: string;
}

const entrySchema = z.object({
  contactName: z.string().trim().min(1, "Name is required").max(120),
  businessName: z
    .string()
    .trim()
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  phone: z.string().trim().min(5, "Phone number is required").max(40),
  email: z
    .union([z.email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => v || null),
  callDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  outcome: z.enum([
    "no_answer",
    "callback",
    "not_interested",
    "interested",
    "booked",
    "wrong_number",
  ]),
  notes: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export type CallEntryInput = z.input<typeof entrySchema>;

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Please check the form.";
}

export async function addCallEntry(
  input: CallEntryInput
): Promise<CallLogActionResult> {
  const profile = await requireProfile();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("call_log").insert({
    logged_by: profile.id,
    contact_name: parsed.data.contactName,
    business_name: parsed.data.businessName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    call_date: parsed.data.callDate,
    outcome: parsed.data.outcome,
    notes: parsed.data.notes,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tracker");
  return { ok: true };
}

export async function updateCallEntry(
  entryId: string,
  input: CallEntryInput
): Promise<CallLogActionResult> {
  const profile = await requireProfile();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

  // RLS also enforces this; checking here gives a friendly message.
  const { data: existing } = await supabase
    .from("call_log")
    .select("logged_by")
    .eq("id", entryId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Entry not found." };
  if (existing.logged_by !== profile.id && profile.role !== "admin") {
    return { ok: false, error: "You can only edit your own call entries." };
  }

  const { error } = await supabase
    .from("call_log")
    .update({
      contact_name: parsed.data.contactName,
      business_name: parsed.data.businessName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      call_date: parsed.data.callDate,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes,
    })
    .eq("id", entryId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tracker");
  return { ok: true };
}

export async function deleteCallEntry(
  entryId: string
): Promise<CallLogActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false, error: "Only admins can delete call entries." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("call_log").delete().eq("id", entryId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tracker");
  return { ok: true };
}

export interface PreviousContactMatch {
  source: "call_log" | "booking";
  name: string;
  business: string | null;
  phone: string;
  when: string; // display label date
  outcome: string | null;
  by: string | null;
}

/**
 * Duplicate-call guard: checks the shared call log (and the caller's visible
 * bookings) for the same phone number or a very similar name/business.
 */
export async function findPreviousContacts(query: {
  phone?: string;
  name?: string;
  business?: string;
  excludeEntryId?: string;
}): Promise<PreviousContactMatch[]> {
  await requireProfile();
  const supabase = await createClient();

  const clean = (v?: string) => v?.replace(/[,()%]/g, " ").trim() ?? "";
  const phone = clean(query.phone);
  const phoneDigits = phone.replace(/\D/g, "");
  const name = clean(query.name);
  const business = clean(query.business);

  const conditions: string[] = [];
  if (phoneDigits.length >= 7) {
    conditions.push(`phone.ilike.%${phoneDigits.slice(-7)}%`);
    conditions.push(`phone.ilike.%${phone}%`);
  }
  if (name.length >= 3) conditions.push(`contact_name.ilike.%${name}%`);
  if (business.length >= 3) conditions.push(`business_name.ilike.%${business}%`);
  if (conditions.length === 0) return [];

  let logQuery = supabase
    .from("call_log")
    .select(
      "id, contact_name, business_name, phone, call_date, outcome, employee:profiles!call_log_logged_by_fkey(full_name, email)"
    )
    .or(conditions.join(","))
    .order("call_date", { ascending: false })
    .limit(3);
  if (query.excludeEntryId) logQuery = logQuery.neq("id", query.excludeEntryId);

  const bookingConditions: string[] = [];
  if (phoneDigits.length >= 7) bookingConditions.push(`phone.ilike.%${phoneDigits.slice(-7)}%`);
  if (business.length >= 3) bookingConditions.push(`business_name.ilike.%${business}%`);

  const [logRes, bookingRes] = await Promise.all([
    logQuery,
    bookingConditions.length > 0
      ? supabase
          .from("bookings")
          .select("first_name, last_name, business_name, phone, meeting_date")
          .or(bookingConditions.join(","))
          .order("meeting_date", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const matches: PreviousContactMatch[] = [];
  type LogRow = Omit<CallLogEntry, "logged_by" | "email" | "notes" | "created_at" | "updated_at"> & {
    employee: { full_name: string; email: string } | null;
  };
  for (const row of (logRes.data ?? []) as unknown as LogRow[]) {
    matches.push({
      source: "call_log",
      name: row.contact_name,
      business: row.business_name,
      phone: row.phone,
      when: row.call_date,
      outcome: row.outcome,
      by: row.employee?.full_name || row.employee?.email || null,
    });
  }
  for (const row of bookingRes.data ?? []) {
    matches.push({
      source: "booking",
      name: `${row.first_name} ${row.last_name}`,
      business: row.business_name,
      phone: row.phone,
      when: row.meeting_date,
      outcome: null,
      by: null,
    });
  }
  return matches.slice(0, 4);
}
