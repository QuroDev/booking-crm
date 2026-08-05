import type { Metadata } from "next";
import { CalendarRange, CheckCircle2, Circle } from "lucide-react";
import {
  isGoogleConfigured,
  isResendConfigured,
  isSupabaseConfigured,
} from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Setup" };

const STEPS = [
  {
    key: "supabase",
    title: "Connect Supabase",
    detail:
      "Create a project at supabase.com, run the SQL files in supabase/migrations (in order) in the SQL editor, then set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local. Seed the admin accounts with scripts/seed-admins.ts.",
  },
  {
    key: "google",
    title: "Google Calendar credentials",
    detail:
      "In Google Cloud Console: enable the Calendar API, configure the OAuth consent screen (External, publishing status In production), create a Web OAuth client with redirect URI {APP_URL}/api/google/oauth/callback, then set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Jayden's connects his calendar later from Settings.",
  },
  {
    key: "resend",
    title: "Email notifications (Resend)",
    detail:
      "Create an API key at resend.com and set RESEND_API_KEY, EMAIL_FROM and NOTIFY_EMAIL. Optional — bookings work without it.",
  },
] as const;

export default function SetupPage() {
  const done: Record<(typeof STEPS)[number]["key"], boolean> = {
    supabase: isSupabaseConfigured(),
    google: isGoogleConfigured(),
    resend: isResendConfigured(),
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <CalendarRange className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Nouveau Booking — Setup
          </h1>
          <p className="text-sm text-muted-foreground">
            Finish these steps, restart the dev server, and you&apos;re in.
          </p>
        </div>
      </div>

      {STEPS.map((step, i) => (
        <Card key={step.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {done[step.key] ? (
                <CheckCircle2 className="size-5 text-success" />
              ) : (
                <Circle className="size-5 text-muted-foreground" />
              )}
              {i + 1}. {step.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {step.detail}
          </CardContent>
        </Card>
      ))}

      <p className="text-center text-xs text-muted-foreground">
        Full instructions live in the project README.
      </p>
    </main>
  );
}
