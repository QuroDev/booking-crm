import { z } from "zod";
import { isValidIanaZone } from "@/lib/datetime";
import { ACQUISITION_METHODS } from "@/lib/constants";

/** Shared client + server validation for the booking form. */
export const bookingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  businessName: z.string().trim().min(1, "Business name is required").max(160),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().min(5, "Phone number is required").max(40),
  whatsapp: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  city: z.string().trim().min(1, "City is required").max(80),
  country: z.string().trim().min(1, "Country is required").max(80),
  timezone: z
    .string()
    .min(1, "Time zone is required")
    .refine(isValidIanaZone, "Select a valid time zone"),
  meetingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Meeting date is required"),
  meetingTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Meeting time is required"),
  durationMinutes: z
    .number()
    .int()
    .min(15, "Too short")
    .max(240, "Too long"),
  callType: z.enum(["google_meet", "phone", "facetime", "whatsapp"], {
    error: "Select a call type",
  }),
  acquisitionMethod: z.enum(ACQUISITION_METHODS, {
    error: "Select how they get customers",
  }),
  interests: z
    .array(z.string().min(1))
    .min(1, "Select at least one interest"),
  notes: z
    .string()
    .max(5000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

export type BookingFormValues = z.input<typeof bookingSchema>;
export type BookingInput = z.output<typeof bookingSchema>;

/** Reschedule accepts only the meeting time fields. */
export const rescheduleSchema = bookingSchema.pick({
  meetingDate: true,
  meetingTime: true,
  timezone: true,
});

export type RescheduleInput = z.output<typeof rescheduleSchema>;
