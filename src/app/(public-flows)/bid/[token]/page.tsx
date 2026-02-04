import { Metadata } from "next";
import { BidForm } from "@/components/features/bid/bid-form";

export const metadata: Metadata = {
  title: "Submit Your Bid - GroupBus",
  description: "Review the trip details and submit your bid.",
};

export default async function BidPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div>
      <BidForm token={token} />
    </div>
  );
}
