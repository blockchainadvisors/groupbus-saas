import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Booking Confirmed - GroupBus",
  description: "Your coach hire booking has been confirmed.",
};

export default async function QuoteSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  // Await the async params per Next.js 16 convention
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  // session_id is available if needed for verification
  const _sessionId = resolvedSearchParams.session_id;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center">
            {/* Success checkmark with CSS animation */}
            <div className="relative mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <svg
                  className="h-10 w-10 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    className="animate-draw-check"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    style={{
                      strokeDasharray: 24,
                      strokeDashoffset: 24,
                      animation: "draw-check 0.5s ease-out 0.3s forwards",
                    }}
                  />
                </svg>
              </div>
              {/* Pulse ring animation */}
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-400 opacity-0"
                style={{
                  animation:
                    "pulse-ring 1s ease-out 0.2s forwards",
                }}
              />
            </div>

            <h1 className="text-2xl font-bold">Your Booking is Confirmed!</h1>
            <p className="mt-2 max-w-md text-muted-foreground">
              Thank you for your payment. Your coach hire booking has been
              successfully confirmed.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-sm space-y-4 rounded-lg border bg-muted/50 p-6">
            <h2 className="font-semibold">What Happens Next?</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>
                  Your supplier will be notified and will confirm the booking
                  details.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span>
                  A job sheet and driver briefing will be prepared and sent to
                  the operator.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span>
                  You will receive a confirmation email with all the details of
                  your trip.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  4
                </span>
                <span>
                  Closer to departure, you will receive final travel
                  instructions and driver contact details.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Questions? Contact us at{" "}
              <a
                href="mailto:support@groupbus.co.uk"
                className="text-primary underline underline-offset-2"
              >
                support@groupbus.co.uk
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CSS keyframe animations */}
      <style>{`
        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
