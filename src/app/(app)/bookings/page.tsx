import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import {
  listBookings,
  listEmployeesForFilter,
} from "@/lib/queries/bookings";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { BookingList } from "@/components/bookings/booking-list";
import { SearchFilters } from "@/components/bookings/search-filters";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    callType?: string;
    employee?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  const [bookings, employees] = await Promise.all([
    listBookings({
      q: params.q,
      status: params.status,
      callType: params.callType,
      employeeId: params.employee,
      from: params.from,
      to: params.to,
    }),
    isAdmin ? listEmployeesForFilter() : Promise.resolve(undefined),
  ]);

  return (
    <>
      <PageHeader
        title="Bookings"
        description={
          isAdmin
            ? "Every strategy call across the team."
            : "Strategy calls you've booked."
        }
        actions={
          <Button size="sm" render={<Link href="/bookings/new" />}>
            <Plus className="size-4" /> New booking
          </Button>
        }
      />
      <Suspense>
        <SearchFilters employees={employees} />
      </Suspense>
      <BookingList bookings={bookings} showEmployee={isAdmin} />
    </>
  );
}
