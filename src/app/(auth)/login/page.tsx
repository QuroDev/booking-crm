import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <CalendarRange className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Nouveau Booking
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to book and manage strategy calls
            </p>
          </div>
        </div>
        <LoginForm next={next} initialError={error === "deactivated" ? "This account has been deactivated." : undefined} />
      </div>
    </main>
  );
}
