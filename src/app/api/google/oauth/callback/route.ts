import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getOAuthClient } from "@/lib/google/oauth";
import { saveGoogleCredentials } from "@/lib/google/tokens";

function emailFromIdToken(idToken: string | null | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { email?: string };
    return decoded.email ?? null;
  } catch {
    return null;
  }
}

const STATE_COOKIE = "google_oauth_state";
const EXPECTED_ACCOUNT = "jaydxn413@gmail.com";

function settingsRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/settings", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (oauthError) return settingsRedirect(request, { error: oauthError });
  if (!code || !state || !expectedState || state !== expectedState) {
    return settingsRedirect(request, { error: "state_mismatch" });
  }

  try {
    const oauthClient = getOAuthClient();
    const { tokens } = await oauthClient.getToken(code);

    if (!tokens.refresh_token) {
      return settingsRedirect(request, { error: "no_refresh_token" });
    }

    // The id_token arrives straight from Google's token endpoint over TLS,
    // so decoding its payload (no signature check) is safe here.
    const googleEmail = emailFromIdToken(tokens.id_token) ?? "unknown";

    await saveGoogleCredentials({
      googleEmail,
      refreshToken: tokens.refresh_token,
      connectedBy: profile.id,
    });

    const params: Record<string, string> = { connected: "1" };
    if (googleEmail.toLowerCase() !== EXPECTED_ACCOUNT) {
      params.warning = "wrong_account";
      params.account = googleEmail;
    }
    return settingsRedirect(request, params);
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return settingsRedirect(request, { error: "token_exchange_failed" });
  }
}
