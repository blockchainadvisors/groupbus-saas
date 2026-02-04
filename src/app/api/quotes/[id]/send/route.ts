import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const quote = await prisma.customerQuote.findUnique({
      where: { id },
      include: {
        enquiry: {
          select: {
            contactName: true,
            contactEmail: true,
            referenceNumber: true,
            pickupLocation: true,
            dropoffLocation: true,
            departureDate: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Only DRAFT or MARKUP_APPLIED quotes can be sent
    if (!["DRAFT", "MARKUP_APPLIED"].includes(quote.status)) {
      return NextResponse.json(
        {
          error: `Cannot send a quote with status "${quote.status}". Quote must be in DRAFT or MARKUP_APPLIED status.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const validUntil =
      quote.validUntil ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updatedQuote = await prisma.customerQuote.update({
      where: { id },
      data: {
        status: "SENT_TO_CUSTOMER",
        sentAt: now,
        validUntil,
      },
      include: {
        enquiry: {
          select: {
            contactName: true,
            contactEmail: true,
            referenceNumber: true,
            pickupLocation: true,
            dropoffLocation: true,
            departureDate: true,
          },
        },
      },
    });

    // Build acceptance link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.groupbus.co.uk";
    const acceptanceLink = `${baseUrl}/quote/accept?token=${updatedQuote.acceptanceToken}`;

    // Queue email to customer
    await emailQueue.add("send-quote-to-customer", {
      to: updatedQuote.enquiry.contactEmail,
      customerName: updatedQuote.enquiry.contactName,
      quoteReference: updatedQuote.referenceNumber,
      enquiryReference: updatedQuote.enquiry.referenceNumber,
      totalPrice: updatedQuote.totalPrice,
      currency: updatedQuote.currency,
      validUntil: validUntil.toISOString(),
      acceptanceLink,
      tripDetails: {
        pickupLocation: updatedQuote.enquiry.pickupLocation,
        dropoffLocation: updatedQuote.enquiry.dropoffLocation,
        departureDate: updatedQuote.enquiry.departureDate,
      },
      aiEmailBody: updatedQuote.aiEmailBody,
    });

    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error("Quote send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
