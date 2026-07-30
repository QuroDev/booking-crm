/**
 * Hand-authored database types mirroring supabase/migrations.
 * If you change the schema, regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 * (and adapt imports), or keep this file in sync manually.
 */

export type UserRole = "admin" | "employee";

export type BookingStatus =
  | "booked"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show"
  | "closed";

export type CallType = "google_meet" | "phone" | "facetime" | "whatsapp";

export type GoogleSyncStatus = "pending" | "synced" | "failed" | "skipped";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  city: string;
  country: string;
  client_timezone: string;
  meeting_date: string; // 'YYYY-MM-DD' (local date in client_timezone)
  meeting_time: string; // 'HH:MM:SS' as returned by Postgres time
  duration_minutes: number;
  start_time_utc: string; // ISO timestamptz
  end_time_utc: string;
  call_type: CallType;
  acquisition_method: string | null;
  interests: string[];
  notes: string | null;
  status: BookingStatus;
  google_event_id: string | null;
  meet_link: string | null;
  google_sync_status: GoogleSyncStatus;
  google_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

/** Booking row joined with its creator's profile (via created_by). */
export type BookingWithEmployee = Booking & {
  employee: Pick<Profile, "id" | "email" | "full_name"> | null;
};

export interface BookingHistoryEntry {
  id: string;
  booking_id: string;
  action: "created" | "rescheduled" | "status_changed" | "edited";
  changed_by: string;
  changed_at: string;
  prev_meeting_date: string | null;
  prev_meeting_time: string | null;
  prev_timezone: string | null;
  prev_start_utc: string | null;
  new_meeting_date: string | null;
  new_meeting_time: string | null;
  new_timezone: string | null;
  new_start_utc: string | null;
  prev_status: BookingStatus | null;
  new_status: BookingStatus | null;
  details: Record<string, unknown>;
}

export type BookingHistoryWithActor = BookingHistoryEntry & {
  actor: Pick<Profile, "id" | "email" | "full_name"> | null;
};

export type CallLogOutcome =
  | "no_answer"
  | "callback"
  | "not_interested"
  | "interested"
  | "booked"
  | "wrong_number";

export interface CallLogEntry {
  id: string;
  logged_by: string;
  contact_name: string;
  business_name: string | null;
  phone: string;
  email: string | null;
  call_date: string; // 'YYYY-MM-DD'
  outcome: CallLogOutcome;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CallLogEntryWithEmployee = CallLogEntry & {
  employee: Pick<Profile, "id" | "email" | "full_name"> | null;
};

export interface GoogleCredentials {
  id: number;
  google_email: string;
  refresh_token: string;
  connected_by: string | null;
  updated_at: string;
}
