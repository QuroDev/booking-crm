import type { Metadata } from "next";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Mail,
  XCircle,
} from "lucide-react";
import { DateTime } from "luxon";
import { requireAdmin } from "@/lib/auth";
import { isGoogleConfigured, isResendConfigured } from "@/lib/env";
import { getGoogleConnection } from "@/lib/google/tokens";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { DisconnectGoogleButton } from "./disconnect-button";

export const metadata: Metadata = { title: "Settings" };

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing from the environment.",
  no_refresh_token:
    "Google didn't return a refresh token. Remove the app's access at myaccount.google.com/permissions, then connect again.",
  state_mismatch: "The sign-in flow expired or was tampered with. Try again.",
  token_exchange_failed: "Exchanging the Google code failed. Try again.",
  access_denied: "You declined the Google consent screen.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    error?: string;
    warning?: string;
    account?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const connection = await getGoogleConnection();
  const googleReady = isGoogleConfigured();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Integrations that power calendar events and notifications."
      />

      {params.connected ? (
        <Alert className="mb-6 border-success/40">
          <CheckCircle2 className="size-4 text-success" />
          <AlertTitle>Google Calendar connected</AlertTitle>
          <AlertDescription>
            New bookings will create calendar events automatically.
          </AlertDescription>
        </Alert>
      ) : null}
      {params.error ? (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="size-4" />
          <AlertTitle>Google connection failed</AlertTitle>
          <AlertDescription>
            {ERROR_MESSAGES[params.error] ?? params.error}
          </AlertDescription>
        </Alert>
      ) : null}
      {params.warning === "wrong_account" ? (
        <Alert className="mb-6 border-warning/40 text-warning">
          <AlertTriangle className="size-4" />
          <AlertTitle>Connected with an unexpected account</AlertTitle>
          <AlertDescription className="text-warning/80">
            Events will be created on {params.account}&apos;s calendar — the
            expected account is jaydxn413@gmail.com. Reconnect while
            signed into the right Google account if this was a mistake.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck2 className="size-4 text-primary" /> Google Calendar
            </CardTitle>
            <CardDescription>
              Bookings create events on Jayden&apos;s calendar
              (jaydxn413@gmail.com) with Google Meet links and client
              invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connection ? (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-3">
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      Connected as {connection.google_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated{" "}
                      {DateTime.fromISO(connection.updated_at).toFormat(
                        "LLL d yyyy, h:mm a"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={<a href="/api/google/oauth/start" />}
                  >
                    Reconnect
                  </Button>
                  <DisconnectGoogleButton />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <AlertTriangle className="size-5 shrink-0 text-warning" />
                  <p className="text-sm">
                    Not connected — bookings save to the CRM but no calendar
                    events are created.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sign into Google as <strong>jaydxn413@gmail.com</strong>{" "}
                  before clicking connect.
                </p>
                <Button
                  size="sm"
                  render={<a href="/api/google/oauth/start" />}
                  disabled={!googleReady}
                >
                  Connect Google Calendar
                </Button>
                {!googleReady ? (
                  <p className="text-xs text-destructive">
                    Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first (see
                    README).
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-primary" /> Email notifications
            </CardTitle>
            <CardDescription>
              Every booking, reschedule and cancellation emails{" "}
              {process.env.NOTIFY_EMAIL ?? "jaydxn413@gmail.com"} via
              Resend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isResendConfigured() ? (
              <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                <CheckCircle2 className="size-5 shrink-0 text-success" />
                Resend is configured.
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="size-5 shrink-0 text-warning" />
                RESEND_API_KEY is not set — notification emails are skipped.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
