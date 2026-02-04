import { Metadata } from "next";
import { QuoteView } from "@/components/features/quote/quote-view";

export const metadata: Metadata = {
  title: "Your Quote - GroupBus",
  description: "Review and respond to your coach hire quote.",
};

export default async function QuoteReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { token } = await params;
  const { cancelled } = await searchParams;

  return (
    <QuoteView token={token} cancelled={cancelled === "true"} />
  );
}
