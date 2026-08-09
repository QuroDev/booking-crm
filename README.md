# Nouveau Booking CRM

A mobile-first CRM for booking client strategy calls. Employees create a booking in under two minutes; the app stores the client record in Supabase, creates a Google Calendar event on Qais's calendar (with a Google Meet link when needed), invites the client, and emails Qais a summary.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Auth + Postgres + RLS) · Luxon · googleapis · Resend · Recharts · Vercel.

## Timezone correctness (the #1 requirement)

All meeting times are interpreted in the **client's selected IANA timezone** — never server time, never UTC:

- The form sends date/time/zone to the server **as strings** (`2026-07-10`, `15:00`, `America/Los_Angeles`).
- One function — `computeMeetingInstant()` in [src/lib/datetime.ts](src/lib/datetime.ts) — converts them (via Luxon, DST-safe) into UTC instants for the database and offset-qualified local ISO strings for Google.
- Google events are created with `start: { dateTime, timeZone }`, so they display correctly for every attendee.
- The DB stores both the original wall-clock values (`meeting_date`, `meeting_time`, `client_timezone`) and the converted `start_time_utc` / `end_time_utc`.
- `npm test` runs the DST test suite (the spec example — 3:00 PM Los Angeles → 22:00 UTC in summer, 23:00 UTC in winter — is a literal test).

## Setup

### 1. Install & run

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev
```

Until `.env.local` is configured, the app shows a setup checklist at `/setup`.

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run each file in `supabase/migrations/` **in order** (0001 → 0005).
3. Copy Project Settings → API values into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. In Authentication → Sign In / Up, **disable public signups** (accounts are created by admins in-app).
5. Seed the two admin accounts (they get the admin role automatically by email):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
$env:ADMIN_SEED_PASSWORD = "<initial password>"
npx tsx scripts/seed-admins.ts
```

Admins: `ur email`, `ur email`. Employees are added from the **Employees** page.

### 3. Google Calendar

Because `dih cheese` is a consumer Gmail account, the app uses a one-time OAuth connection (not a service account):

1. In [Google Cloud Console](https://console.cloud.google.com): create a project → **Enable the Google Calendar API**.
2. **OAuth consent screen**: User type *External*. Add the scope `https://www.googleapis.com/auth/calendar.events`. Then set **Publishing status to "In production"** — in Testing mode refresh tokens expire after 7 days and the integration silently breaks. (An unverified production app just shows a one-time warning screen to Qais.)
3. **Credentials → Create OAuth client ID** (Web application). Authorized redirect URIs:
   - `http://localhost:3000/api/google/oauth/callback`
   - `https://<your-vercel-domain>/api/google/oauth/callback`
4. Put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.local`.
5. In the app, sign in as an admin → **Settings → Connect Google Calendar**, while signed into Google as **qaisnaveed2008@gmail.com**.

If Google is not connected, bookings still save — the booking page shows a warning and a **Retry sync** button.

### 4. Resend (email notifications)

1. Create an API key at [resend.com](https://resend.com) → `RESEND_API_KEY`.
2. Sandbox note: without a verified domain, Resend only delivers from `onboarding@resend.dev` **to the Resend account owner's email**. Verify a domain and set `EMAIL_FROM` for production.
3. `NOTIFY_EMAIL` is who receives booking notifications (default `qaisnaveed2008@gmail.com`).

### 5. Deploy to Vercel

1. Push the repo to GitHub and import it into Vercel.
2. Add every variable from `.env.example`, with `NEXT_PUBLIC_APP_URL` set to the production URL.
3. Add the production redirect URI in Google Cloud (step 3.3), and set the Supabase Auth "Site URL" to the production URL.
4. Smoke-test: book a call → check the calendar event time, Meet link and email.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: employee creation + Google token storage |
| `NEXT_PUBLIC_APP_URL` | Base URL (drives the OAuth redirect URI) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth web client |
| `RESEND_API_KEY` / `EMAIL_FROM` / `NOTIFY_EMAIL` | Email notifications |
| `NEXT_PUBLIC_BUSINESS_TIMEZONE` | Optional; dashboard/calendar display zone (default `America/New_York`) |

## Architecture notes

- **Roles:** `profiles.role` is assigned by a DB trigger — the two admin emails become `admin`, everyone else `employee`. RLS lets employees see only their own bookings; admins see everything (via a `SECURITY DEFINER is_admin()` helper).
- **Booking flow:** server action validates (zod) → DB insert → Google event (create/patch, `sendUpdates: all`, Meet via `conferenceData.createRequest`) → Resend email. Google/email failures never lose the booking; sync state is tracked per row (`google_sync_status`).
- **Rescheduling** calls the atomic `reschedule_booking` RPC (snapshots the old meeting into `booking_history`), patches the existing Google event with the new `dateTime`+`timeZone`, and re-invites attendees.
- **Cancelling** deletes the Google event (attendees notified) but keeps the CRM record.
- **Future channels:** `src/lib/email/notifications.ts` consumes a `NotificationEvent` — add SMS/WhatsApp/Slack senders on the same seam.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm test` — timezone/DST test suite
- `npx tsx scripts/seed-admins.ts` — one-time admin seeding
