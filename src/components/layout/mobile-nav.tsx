"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  PhoneCall,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/bookings", label: "Bookings", icon: ListChecks },
    { href: "/bookings/new", label: "New", icon: Plus, cta: true },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/tracker", label: "Tracker", icon: PhoneCall },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-lg md:hidden">
      <div
        className="mx-auto flex max-w-md items-center justify-around px-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const active =
            item.href === "/bookings"
              ? pathname === "/bookings" ||
                (pathname.startsWith("/bookings/") &&
                  !pathname.startsWith("/bookings/new"))
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          if ("cta" in item && item.cta) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <item.icon className="size-5" />
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
