import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Video,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  getBooking,
  getBookingHistory,
  getClientHistory,
} from "@/lib/queries/bookings";
import { formatBookingLocal, formatUtcInZone } from "@/lib/datetime";
import { businessZone } from "@/lib/queries/stats";
import { callTypeLabel } from "@/lib/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ClientHistory } from "@/components/bookings/client-history";
import { CopyButton } from "@/components/bookings/copy-button";
import { HistoryTimeline } from "@/components/bookings/history-timeline";
import { StatusBadge } from "@/components/bookings/status-badge";
import {
  RetrySyncButton,
  StatusActions,
} from "@/components/bookings/status-actions";
import type { Booking } from "@/types/database";

export const metadata: Metadata = { title: "Booking details" };

function googleEventUrl(eventId: string | null): string | null {
  if (!eventId) return null;
  const eid = Buffer.from(`${eventId} jaydxn413@gmail.com`)
    .toString("base64")
    .replace(/=+$/, "");
  return `https://calendar.google.com/calendar/event?eid=${eid}`;
}

function clientDetailsText(booking: Booking): string {
  return [
    `Name: ${booking.first_name} ${booking.last_name}`,
    `Business: ${booking.business_name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    booking.whatsapp ? `WhatsApp: ${booking.whatsapp}` : null,
    `City: ${booking.city}, ${booking.country}`,
    `Time Zone: ${booking.client_timezone}`,
    `Meeting: ${formatBookingLocal(booking)}`,
    `Call Type: ${callTypeLabel(booking.call_type)}`,
    booking.meet_link ? `Google Meet: ${booking.meet_link}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const booking = await getBooking(id);
  if (!booking) notFound();

  const [history, clientHistory] = await Promise.all([
    getBookingHistory(id),
    getClientHistory(booking.email, id),
  ]);

  const isAdmin = profile.role === "admin";
  const zone = businessZone();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`${booking.first_name} ${booking.last_name}`}
        description={booking.business_name}
        actions={<StatusBadge status={booking.status} className="text-sm" />}
      />

      <div className="mb-6">
        <StatusActions
          booking={booking}
          isAdmin={isAdmin}
          googleEventUrl={googleEventUrl(booking.google_event_id)}
        />
      </div>

      {booking.google_sync_status === "failed" ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="size-4" />
          <AlertTitle>Google Calendar sync failed</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{booking.google_sync_error ?? "Unknown error."}</span>
            <RetrySyncButton bookingId={booking.id} />
          </AlertDescription>
        </Alert>
      ) : null}
      {booking.google_sync_status === "skipped" &&
      booking.status !== "cancelled" ? (
        <Alert className="mb-6 border-warning/40 text-warning">
          <AlertTriangle className="size-4" />
          <AlertTitle>No calendar event</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-warning/80">
            <span>
              Google Calendar wasn&apos;t connected when this was saved.
            </span>
            <RetrySyncButton bookingId={booking.id} />
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" /> Meeting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={CalendarClock}
              label="Client's local time"
              value={
                <span className="font-medium">
                  {formatBookingLocal(booking)}
                </span>
              }
            />
            <InfoRow
              icon={Globe}
              label={`Business time (${zone.replaceAll("_", " ")})`}
              value={formatUtcInZone(booking.start_time_utc, zone)}
            />
            <InfoRow
              icon={Clock}
              label="Length"
              value={`${booking.duration_minutes} minutes`}
            />
            <InfoRow
              icon={Video}
              label="Call type"
              value={callTypeLabel(booking.call_type)}
            />
            {booking.meet_link ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <a
                  href={booking.meet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                >
                  {booking.meet_link}
                </a>
                <CopyButton value={booking.meet_link} label="Meet link" />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> Client
              </span>
              <CopyButton
                value={clientDetailsText(booking)}
                label="Client details"
                variant="ghost"
              >
                Copy details
              </CopyButton>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Mail}
              label="Email"
              value={
                <a
                  href={`mailto:${booking.email}`}
                  className="hover:text-primary"
                >
                  {booking.email}
                </a>
              }
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={
                <a href={`tel:${booking.phone}`} className="hover:text-primary">
                  {booking.phone}
                </a>
              }
            />
            {booking.whatsapp ? (
              <InfoRow
                icon={MessageCircle}
                label="WhatsApp"
                value={booking.whatsapp}
              />
            ) : null}
            <InfoRow
              icon={MapPin}
              label="Location"
              value={`${booking.city}, ${booking.country}`}
            />
            <InfoRow
              icon={Globe}
              label="Time zone"
              value={booking.client_timezone}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Business questions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">
                How they get customers
              </p>
              <p className="mt-1 text-sm">
                {booking.acquisition_method ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Main interest</p>
              <p className="mt-1 text-sm">
                {booking.interests.join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Booked by</p>
              <p className="mt-1 text-sm">
                {booking.employee?.full_name || booking.employee?.email || "—"}
              </p>
            </div>
            {booking.notes ? (
              <div className="sm:col-span-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {booking.notes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ClientHistory bookings={clientHistory} />

        <div className={clientHistory.length === 0 ? "lg:col-span-2" : ""}>
          <HistoryTimeline entries={history} />
        </div>
      </div>
    </div>
  );
}
