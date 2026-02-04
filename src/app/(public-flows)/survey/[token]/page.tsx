import { Metadata } from "next";
import { SurveyForm } from "@/components/features/survey/survey-form";

export const metadata: Metadata = {
  title: "Trip Feedback - GroupBus",
  description: "Share your feedback about your recent trip.",
};

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Trip Feedback</h1>
        <p className="mt-2 text-muted-foreground">
          We value your feedback. Please take a moment to rate your recent trip.
        </p>
      </div>
      <SurveyForm token={token} />
    </div>
  );
}
