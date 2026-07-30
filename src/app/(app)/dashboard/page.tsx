import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Plus,
  Search,
  Sun,
  TrendingUp,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getDashboardStats } from "@/lib/queries/stats";
import {
  getRecentActivity,
  getUpcomingBookings,
} from "@/lib/queries/bookings";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const [stats, upcoming, activity] = await Promise.all([
    getDashboardStats(),
    getUpcomingBookings(5),
    getRecentActivity(8),
  ]);

  const firstName = (profile.full_name || profile.email).split(/[\s@]/)[0];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          isAdmin
            ? "Everything happening across the team."
            : "Your strategy call pipeline."
        }
        actions={
          <Button size="sm" render={<Link href="/bookings/new" />}>
            <Plus className="size-4" /> New booking
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Today's meetings"
          value={stats.todayCount}
          icon={Sun}
          tone="primary"
        />
        <StatCard
          label="Upcoming"
          value={stats.upcomingCount}
          icon={CalendarCheck2}
        />
        <StatCard
          label="Completed"
          value={stats.completedCount}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelledCount}
          icon={CalendarX2}
          tone="destructive"
        />
        <StatCard
          label="Booked this month"
          value={stats.monthCount}
          icon={TrendingUp}
          tone="warning"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" render={<Link href="/bookings/new" />}>
          <Plus className="size-4" /> New booking
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/calendar" />}>
          <CalendarDays className="size-4" /> View calendar
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/bookings" />}>
          <Search className="size-4" /> Search clients
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingList bookings={upcoming} showEmployee={isAdmin} />
        <RecentActivity entries={activity} />
      </div>
    </>
  );
}
