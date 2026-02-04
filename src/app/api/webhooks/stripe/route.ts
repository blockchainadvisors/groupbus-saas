import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { generateReferenceNumber } from "@/lib/tokens";
import { aiPipelineQueue } from "@/lib/queue";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerQuoteId = session.metadata?.customerQuoteId;

        if (!customerQuoteId) {
          console.error("No customerQuoteId in session metadata");
          break;
        }

        // Update the payment record
        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: {
            status: "SUCCEEDED",
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
          },
        });

        // Fetch the customer quote with supplier quote for organisationId
        const customerQuote = await prisma.customerQuote.findUnique({
          where: { id: customerQuoteId },
          include: {
            supplierQuote: true,
          },
        });

        if (!customerQuote) {
          console.error("Customer quote not found:", customerQuoteId);
          break;
        }

        // Update the customer quote status
        await prisma.customerQuote.update({
          where: { id: customerQuoteId },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        });

        // Generate booking reference number using atomic sequence upsert
        const year = new Date().getFullYear();
        const seq = await prisma.sequence.upsert({
          where: { prefix_year: { prefix: "BKG", year } },
          update: { currentValue: { increment: 1 } },
          create: { prefix: "BKG", year, currentValue: 1 },
        });
        const bookingRef = generateReferenceNumber("BKG", seq.currentValue);

        // Create the booking
        await prisma.booking.create({
          data: {
            referenceNumber: bookingRef,
            enquiryId: customerQuote.enquiryId,
            customerQuoteId: customerQuote.id,
            organisationId: customerQuote.supplierQuote.organisationId,
            status: "CONFIRMED",
          },
        });

        // Update the enquiry status to ACCEPTED
        await prisma.enquiry.update({
          where: { id: customerQuote.enquiryId },
          data: { status: "ACCEPTED" },
        });

        // Queue AI pipeline for job confirmation documents
        await aiPipelineQueue.add("flow6:job-confirmation", {
          customerQuoteId: customerQuote.id,
          pipelineId: `flow6-${customerQuote.id}`,
        });

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: "FAILED" },
        });

        break;
      }

      default:
        // Unhandled event type - log but don't error
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
