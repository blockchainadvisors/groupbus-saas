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
    const priceFormatted = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: updatedQuote.currency || "GBP",
    }).format(Number(updatedQuote.totalPrice));

    const emailBody = updatedQuote.aiEmailBody
      ? `<p>${updatedQuote.aiEmailBody.replace(/\n/g, "</p><p>")}</p>`
      : `
        <p>Dear ${updatedQuote.enquiry.contactName},</p>
        <p>Thank you for your enquiry <strong>${updatedQuote.enquiry.referenceNumber}</strong>.</p>
        <p>We are pleased to provide you with a quote for your trip:</p>
        <p><strong>From:</strong> ${updatedQuote.enquiry.pickupLocation}<br/>
           <strong>To:</strong> ${updatedQuote.enquiry.dropoffLocation}<br/>
           <strong>Date:</strong> ${updatedQuote.enquiry.departureDate?.toLocaleDateString("en-GB")}</p>
        <p><strong>Total Price: ${priceFormatted}</strong></p>
        <p>This quote is valid until <strong>${validUntil.toLocaleDateString("en-GB")}</strong>.</p>
      `.trim();

    await emailQueue.add("send-email", {
      to: updatedQuote.enquiry.contactEmail,
      subject: `Your GroupBus Quote ${updatedQuote.referenceNumber} – ${priceFormatted}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Your Quote from GroupBus</h2>
          ${emailBody}
          <p style="margin-top: 24px;">
            <a href="${acceptanceLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Quote & Pay
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">Quote reference: ${updatedQuote.referenceNumber}. Valid until ${validUntil.toLocaleDateString("en-GB")}.</p>
          <p>Kind regards,<br/>GroupBus</p>
        </div>
      `.trim(),
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
