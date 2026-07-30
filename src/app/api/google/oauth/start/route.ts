import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/env";
import { getAuthUrl } from "@/lib/google/oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?error=google_not_configured", request.url)
    );
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getAuthUrl(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
