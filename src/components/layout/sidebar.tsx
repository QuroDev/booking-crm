"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
          <CalendarRange className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Nouveau</p>
          <p className="text-[11px] text-muted-foreground">Booking Bitch Ass Nigga</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active =
            item.href === "/bookings"
              ? pathname === "/bookings" ||
                (pathname.startsWith("/bookings/") &&
                  !pathname.startsWith("/bookings/new"))
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn("size-4", active && "text-primary")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Nouveau
        </p>
      </div>
    </aside>
  );
}
