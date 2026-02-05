import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";
import { renderEmail } from "@/lib/email/render";

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const acceptanceLink = `${baseUrl}/quote/accept?token=${updatedQuote.acceptanceToken}`;

    // Queue email to customer using React Email template
    const priceFormatted = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: updatedQuote.currency || "GBP",
    }).format(Number(updatedQuote.totalPrice));

    const emailHtml = await renderEmail({
      type: "quote",
      props: {
        customerName: updatedQuote.enquiry.contactName,
        quoteReference: updatedQuote.referenceNumber,
        tripDetails: {
          pickupLocation: updatedQuote.enquiry.pickupLocation ?? "",
          dropoffLocation: updatedQuote.enquiry.dropoffLocation ?? "",
          departureDate: updatedQuote.enquiry.departureDate?.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }) ?? "",
          passengerCount: 0, // Will be populated from enquiry if available
        },
        totalPrice: priceFormatted,
        validUntil: validUntil.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        acceptUrl: acceptanceLink,
        personalizedMessage: updatedQuote.aiEmailBody ?? undefined,
      },
    });

    await emailQueue.add("send-email", {
      to: updatedQuote.enquiry.contactEmail,
      subject: `Your GroupBus Quote ${updatedQuote.referenceNumber} – ${priceFormatted}`,
      html: emailHtml,
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
