import "server-only";

import { google } from "googleapis";
import { appUrl } from "@/lib/env";

/**
 * Derived from the constructor because the dependency tree contains two
 * google-auth-library versions; this always matches what googleapis expects.
 */
export type GoogleOAuthClient = InstanceType<typeof google.auth.OAuth2>;

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured");
    this.name = "GoogleNotConfiguredError";
  }
}

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/google/oauth/callback";

export function getOAuthClient(): GoogleOAuthClient {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new GoogleNotConfiguredError();
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl()}${GOOGLE_OAUTH_CALLBACK_PATH}`
  );
}

export function getAuthUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    // offline + consent guarantees a refresh_token on every (re)connect.
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
      "email",
    ],
    state,
  });
}
