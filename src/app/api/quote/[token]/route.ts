import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const customerQuote = await prisma.customerQuote.findUnique({
      where: { acceptanceToken: token },
      include: {
        enquiry: true,
        supplierQuote: {
          include: {
            organisation: {
              select: {
                name: true,
              },
            },
          },
        },
        booking: {
          select: {
            referenceNumber: true,
          },
        },
      },
    });

    if (!customerQuote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Check if quote has expired
    if (
      customerQuote.status === "SENT_TO_CUSTOMER" &&
      customerQuote.validUntil &&
      new Date(customerQuote.validUntil) < new Date()
    ) {
      await prisma.customerQuote.update({
        where: { id: customerQuote.id },
        data: { status: "EXPIRED" },
      });
      customerQuote.status = "EXPIRED";
    }

    const { enquiry } = customerQuote;

    return NextResponse.json({
      referenceNumber: customerQuote.referenceNumber,
      status: customerQuote.status,
      subtotal: customerQuote.subtotal,
      vatRate: customerQuote.vatRate,
      vatAmount: customerQuote.vatAmount,
      totalPrice: customerQuote.totalPrice,
      currency: customerQuote.currency,
      validUntil: customerQuote.validUntil,
      aiDescription: customerQuote.aiDescription,
      sentAt: customerQuote.sentAt,
      bookingReference: customerQuote.booking?.referenceNumber ?? null,
      supplierName: customerQuote.supplierQuote.organisation.name,
      trip: {
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation,
        departureDate: enquiry.departureDate,
        departureTime: enquiry.departureTime,
        returnDate: enquiry.returnDate,
        returnTime: enquiry.returnTime,
        passengerCount: enquiry.passengerCount,
        vehicleType: enquiry.vehicleType,
        enquiryReference: enquiry.referenceNumber,
      },
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
