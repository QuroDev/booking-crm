export const APP_NAME = "Nouveau Booking";

/** Emails that are automatically granted the admin role (see supabase/migrations/0001). */
export const ADMIN_EMAILS = [
  "qaisnaveed2008@gmail.com",
  "jaydxn413@gmail.com",
] as const;

/** Calendar owner + notification recipient. */
export const OWNER_NAME = "Qais";

export const CALL_TYPES = [
  { value: "google_meet", label: "Google Meet" },
  { value: "phone", label: "Phone Call" },
  { value: "facetime", label: "FaceTime" },
  { value: "whatsapp", label: "WhatsApp Call" },
] as const;

export type CallType = (typeof CALL_TYPES)[number]["value"];

export const BOOKING_STATUSES = [
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "no_show", label: "No Show" },
  { value: "closed", label: "Closed" },
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number]["value"];

export const ACQUISITION_METHODS = [
  "Referrals",
  "Google",
  "Social Media",
  "Walk-ins",
  "Paid Ads",
  "Other",
] as const;

export const MAIN_INTERESTS = [
  "Website",
  "SEO",
  "Content Marketing",
  "Google Ads",
  "Facebook Ads",
  "Branding",
  "Automation",
  "Systems",
  "CRM",
  "AI",
  "Other",
] as const;

export const CALL_OUTCOMES = [
  { value: "no_answer", label: "No answer" },
  { value: "callback", label: "Call back later" },
  { value: "not_interested", label: "Not interested" },
  { value: "interested", label: "Interested" },
  { value: "booked", label: "Booked a meeting" },
  { value: "wrong_number", label: "Wrong number" },
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number]["value"];

export function callOutcomeLabel(value: string): string {
  return CALL_OUTCOMES.find((o) => o.value === value)?.label ?? value;
}

export const MEETING_LENGTHS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "2 hours" },
] as const;

export const DEFAULT_MEETING_LENGTH = 60;

export function callTypeLabel(value: string): string {
  return CALL_TYPES.find((c) => c.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  return BOOKING_STATUSES.find((s) => s.value === value)?.label ?? value;
}
