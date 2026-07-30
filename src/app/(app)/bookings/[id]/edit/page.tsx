import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBooking } from "@/lib/queries/bookings";
import { PageHeader } from "@/components/layout/page-header";
import { BookingForm } from "@/components/bookings/booking-form";

export const metadata: Metadata = { title: "Edit booking" };

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Edit booking"
        description={`${booking.first_name} ${booking.last_name} · ${booking.business_name}`}
      />
      <BookingForm booking={booking} />
    </div>
  );
}
