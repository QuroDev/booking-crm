import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  PhoneCall,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: ListChecks },
  { href: "/bookings/new", label: "New Booking", icon: Plus },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tracker", label: "Call Tracker", icon: PhoneCall },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/employees", label: "Employees", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];
