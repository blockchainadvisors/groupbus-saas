import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const customerQuote = await prisma.customerQuote.findUnique({
      where: { acceptanceToken: token },
      include: {
        enquiry: true,
      },
    });

    if (!customerQuote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    if (customerQuote.status !== "SENT_TO_CUSTOMER") {
      return NextResponse.json(
        { error: "This quote can no longer be accepted" },
        { status: 400 }
      );
    }

    if (
      customerQuote.validUntil &&
      new Date(customerQuote.validUntil) < new Date()
    ) {
      await prisma.customerQuote.update({
        where: { id: customerQuote.id },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { error: "This quote has expired" },
        { status: 410 }
      );
    }

    const { enquiry } = customerQuote;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: customerQuote.currency.toLowerCase(),
            product_data: {
              name: `Coach Hire - ${enquiry.referenceNumber}`,
              description: `${enquiry.pickupLocation} to ${enquiry.dropoffLocation ?? "N/A"}`,
            },
            unit_amount: Math.round(customerQuote.totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        customerQuoteId: customerQuote.id,
        enquiryId: customerQuote.enquiryId,
        acceptanceToken: token,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/quote/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/quote/${token}?cancelled=true`,
    });

    await prisma.payment.create({
      data: {
        customerQuoteId: customerQuote.id,
        stripeSessionId: session.id,
        amount: customerQuote.totalPrice,
        currency: customerQuote.currency,
        status: "PENDING",
        description: `Payment for quote ${customerQuote.referenceNumber}`,
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Error accepting quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
