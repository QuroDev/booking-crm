import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  return (
    <div className="min-h-dvh">
      <Sidebar isAdmin={isAdmin} />
      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg md:h-16 md:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 md:hidden"
            aria-label="Dashboard"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
              <CalendarRange className="size-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Nouveau
            </span>
          </Link>
          <div className="hidden md:block" />
          <UserMenu
            name={profile.full_name}
            email={profile.email}
            isAdmin={isAdmin}
          />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-8 md:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
