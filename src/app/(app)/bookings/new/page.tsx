import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { BookingForm } from "@/components/bookings/booking-form";

export const metadata: Metadata = { title: "New booking" };

export default function NewBookingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New booking"
        description="Book a strategy call — the calendar invite and Meet link are created automatically."
      />
      <BookingForm />
    </div>
  );
}
