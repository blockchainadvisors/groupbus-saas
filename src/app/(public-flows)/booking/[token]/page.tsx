import { Metadata } from "next";
import { BookingResponseForm } from "@/components/features/booking/booking-response-form";

export const metadata: Metadata = {
  title: "Respond to Booking Assignment - GroupBus",
  description: "Review the booking details and accept or reject the assignment.",
};

export default async function BookingResponsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div>
      <BookingResponseForm token={token} />
    </div>
  );
}
