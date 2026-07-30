"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
import {
  Briefcase,
  CalendarClock,
  Info,
  Loader2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { createBooking, updateBooking } from "@/actions/bookings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACQUISITION_METHODS,
  CALL_TYPES,
  DEFAULT_MEETING_LENGTH,
  MAIN_INTERESTS,
  MEETING_LENGTHS,
} from "@/lib/constants";
import {
  bookingSchema,
  type BookingFormValues,
  type BookingInput,
} from "@/lib/validation/booking";
import type { Booking } from "@/types/database";
import { TimezoneSelect } from "./timezone-select";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function bookingToDefaults(booking?: Booking): BookingFormValues {
  if (!booking) {
    return {
      firstName: "",
      lastName: "",
      businessName: "",
      email: "",
      phone: "",
      whatsapp: "",
      city: "",
      country: "",
      timezone: "",
      meetingDate: "",
      meetingTime: "",
      durationMinutes: DEFAULT_MEETING_LENGTH,
      callType: "google_meet",
      acquisitionMethod: undefined as unknown as BookingFormValues["acquisitionMethod"],
      interests: [],
      notes: "",
    };
  }
  return {
    firstName: booking.first_name,
    lastName: booking.last_name,
    businessName: booking.business_name,
    email: booking.email,
    phone: booking.phone,
    whatsapp: booking.whatsapp ?? "",
    city: booking.city,
    country: booking.country,
    timezone: booking.client_timezone,
    meetingDate: booking.meeting_date,
    meetingTime: booking.meeting_time.slice(0, 5),
    durationMinutes: booking.duration_minutes,
    callType: booking.call_type,
    acquisitionMethod:
      (booking.acquisition_method as BookingFormValues["acquisitionMethod"]) ??
      (undefined as unknown as BookingFormValues["acquisitionMethod"]),
    interests: booking.interests,
    notes: booking.notes ?? "",
  };
}

export function BookingForm({ booking }: { booking?: Booking }) {
  const router = useRouter();
  const isEdit = Boolean(booking);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BookingFormValues, unknown, BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: bookingToDefaults(booking),
    mode: "onTouched",
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = form;

  const [meetingDate, meetingTime, timezone] = watch([
    "meetingDate",
    "meetingTime",
    "timezone",
  ]);

  // Live confirmation of what will land on the calendar — the trust signal
  // that the timezone is being honored.
  const preview = useMemo(() => {
    if (!meetingDate || !meetingTime || !timezone) return null;
    const dt = DateTime.fromISO(`${meetingDate}T${meetingTime}`, {
      zone: timezone,
    });
    if (!dt.isValid) return null;
    const local = dt.setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const clientLabel = dt.toFormat("ccc, LLL d yyyy · h:mm a (ZZZZ)");
    const localLabel = local.toFormat("ccc h:mm a (ZZZZ)");
    return { clientLabel, localLabel, showLocal: local.offset !== dt.offset };
  }, [meetingDate, meetingTime, timezone]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = isEdit
        ? await updateBooking(booking!.id, values as BookingFormValues)
        : await createBooking(values as BookingFormValues);

      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      if (result.warning) toast.warning(result.warning, { duration: 8000 });
      toast.success(isEdit ? "Booking updated" : "Meeting booked");
      router.push(`/bookings/${result.bookingId ?? booking?.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  });

  const today = DateTime.now().toISODate();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── Client information ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4 text-primary" /> Client information
          </CardTitle>
          <CardDescription>Who is this strategy call with?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name *</Label>
            <Input
              id="firstName"
              autoComplete="off"
              aria-invalid={!!errors.firstName}
              {...register("firstName")}
            />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name *</Label>
            <Input
              id="lastName"
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
            <FieldError message={errors.lastName?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessName">Business name *</Label>
            <Input
              id="businessName"
              aria-invalid={!!errors.businessName}
              {...register("businessName")}
            />
            <FieldError message={errors.businessName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address *</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number *</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="Optional"
              {...register("whatsapp")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              aria-invalid={!!errors.city}
              {...register("city")}
            />
            <FieldError message={errors.city?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              aria-invalid={!!errors.country}
              {...register("country")}
            />
            <FieldError message={errors.country?.message} />
          </div>
        </CardContent>
      </Card>

      {/* ── Meeting information ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-primary" /> Meeting
            information
          </CardTitle>
          <CardDescription>
            Times are interpreted in the client&apos;s time zone — exactly what
            lands on the calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {isEdit ? (
            <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              Date, time and time zone are changed with the Reschedule action
              on the booking page, so the calendar invite moves correctly and
              history is kept.
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="meetingDate">Meeting date *</Label>
            <Input
              id="meetingDate"
              type="date"
              min={today ?? undefined}
              disabled={isEdit}
              aria-invalid={!!errors.meetingDate}
              {...register("meetingDate")}
            />
            <FieldError message={errors.meetingDate?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingTime">Meeting time *</Label>
            <Input
              id="meetingTime"
              type="time"
              disabled={isEdit}
              aria-invalid={!!errors.meetingTime}
              {...register("meetingTime")}
            />
            <FieldError message={errors.meetingTime?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="timezone">Client time zone *</Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) =>
                isEdit ? (
                  <Input value={field.value} disabled />
                ) : (
                  <TimezoneSelect
                    id="timezone"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!errors.timezone}
                  />
                )
              }
            />
            <FieldError message={errors.timezone?.message} />
          </div>
          {preview ? (
            <div className="sm:col-span-2 rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs">
              <p className="font-medium text-primary">
                Calendar event: {preview.clientLabel}
              </p>
              {preview.showLocal ? (
                <p className="mt-0.5 text-muted-foreground">
                  That&apos;s {preview.localLabel} your time.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Meeting length *</Label>
            <Controller
              control={control}
              name="durationMinutes"
              render={({ field }) => (
                <Select
                  items={MEETING_LENGTHS.map((l) => ({
                    label: l.label,
                    value: String(l.value),
                  }))}
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_LENGTHS.map((length) => (
                      <SelectItem key={length.value} value={String(length.value)}>
                        {length.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Call type *</Label>
            <Controller
              control={control}
              name="callType"
              render={({ field }) => (
                <Select
                  items={CALL_TYPES.map((c) => ({
                    label: c.label,
                    value: c.value,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.callType}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.callType?.message} />
          </div>
        </CardContent>
      </Card>

      {/* ── Business questions ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="size-4 text-primary" /> Business questions
          </CardTitle>
          <CardDescription>
            Context for the strategy call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>How do they get customers? *</Label>
            <Controller
              control={control}
              name="acquisitionMethod"
              render={({ field }) => (
                <Select
                  items={ACQUISITION_METHODS.map((m) => ({
                    label: m,
                    value: m,
                  }))}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.acquisitionMethod}
                  >
                    <SelectValue placeholder="Select a method…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACQUISITION_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.acquisitionMethod?.message} />
          </div>
          <div className="space-y-2">
            <Label>Main interest * (select all that apply)</Label>
            <Controller
              control={control}
              name="interests"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {MAIN_INTERESTS.map((interest) => {
                    const active = field.value.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((i) => i !== interest)
                              : [...field.value, interest]
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            <FieldError message={errors.interests?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={5}
              placeholder="Anything Qais should know before the call…"
              {...register("notes")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} className="min-w-36">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Save changes" : "Book meeting"}
        </Button>
      </div>
    </form>
  );
}
