import "server-only";

import { google, type calendar_v3 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOAuthClient } from "./oauth";

export class GoogleNotConnectedError extends Error {
  constructor() {
    super("Google Calendar is not connected");
    this.name = "GoogleNotConnectedError";
  }
}

export interface GoogleConnection {
  google_email: string;
  connected_by: string | null;
  updated_at: string;
}

/** Connection status for the Settings page (no secrets exposed). */
export async function getGoogleConnection(): Promise<GoogleConnection | null> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }
  const { data } = await admin
    .from("google_credentials")
    .select("google_email, connected_by, updated_at")
    .eq("id", 1)
    .maybeSingle();
  return (data as GoogleConnection) ?? null;
}

export async function saveGoogleCredentials(input: {
  googleEmail: string;
  refreshToken: string;
  connectedBy: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("google_credentials").upsert({
    id: 1,
    google_email: input.googleEmail,
    refresh_token: input.refreshToken,
    connected_by: input.connectedBy,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to save Google credentials: ${error.message}`);
}

/** Called when Google reports invalid_grant — forces a reconnect from Settings. */
export async function clearGoogleCredentials(): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("google_credentials").delete().eq("id", 1);
  } catch {
    // Nothing to clear if the service role isn't configured.
  }
}

/** An authorized Calendar client for Jayden's account. Throws GoogleNotConnectedError. */
export async function getAuthorizedCalendar(): Promise<calendar_v3.Calendar> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    throw new GoogleNotConnectedError();
  }

  const { data } = await admin
    .from("google_credentials")
    .select("refresh_token")
    .eq("id", 1)
    .maybeSingle();

  if (!data?.refresh_token) throw new GoogleNotConnectedError();

  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: data.refresh_token });
  // googleapis refreshes access tokens automatically from the refresh token.
  return google.calendar({ version: "v3", auth });
}

/** True when the underlying Google error means the stored token is dead. */
export function isInvalidGrant(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("invalid_grant");
}
