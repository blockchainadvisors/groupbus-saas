import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { aiPipelineQueue } from "@/lib/queue";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const bidSchema = z.object({
  basePrice: z.number().min(1, "Base price must be at least 1"),
  fuelSurcharge: z.number().min(0).optional().default(0),
  tollCharges: z.number().min(0).optional().default(0),
  parkingCharges: z.number().min(0).optional().default(0),
  otherCharges: z.number().min(0).optional().default(0),
  vehicleOffered: z.string().optional(),
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer").optional(),
  validUntil: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findSupplierEnquiry(token: string) {
  return prisma.supplierEnquiry.findUnique({
    where: { accessToken: token },
    include: {
      enquiry: true,
      organisation: true,
      supplierQuote: true,
    },
  });
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

// ---------------------------------------------------------------------------
// GET /api/bid/[token]
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const supplierEnquiry = await findSupplierEnquiry(token);

    if (!supplierEnquiry) {
      return NextResponse.json(
        { error: "Bid request not found" },
        { status: 404 }
      );
    }

    if (isExpired(supplierEnquiry.expiresAt)) {
      return NextResponse.json(
        { error: "This bid request has expired" },
        { status: 410 }
      );
    }

    // If a quote already exists, return it
    if (supplierEnquiry.supplierQuote) {
      return NextResponse.json({
        status: "already_submitted",
        quote: {
          basePrice: supplierEnquiry.supplierQuote.basePrice,
          fuelSurcharge: supplierEnquiry.supplierQuote.fuelSurcharge,
          tollCharges: supplierEnquiry.supplierQuote.tollCharges,
          parkingCharges: supplierEnquiry.supplierQuote.parkingCharges,
          otherCharges: supplierEnquiry.supplierQuote.otherCharges,
          totalPrice: supplierEnquiry.supplierQuote.totalPrice,
          currency: supplierEnquiry.supplierQuote.currency,
          vehicleOffered: supplierEnquiry.supplierQuote.vehicleOffered,
          notes: supplierEnquiry.supplierQuote.notes,
          validUntil: supplierEnquiry.supplierQuote.validUntil,
          createdAt: supplierEnquiry.supplierQuote.createdAt,
        },
      });
    }

    // Update viewedAt if not already set
    if (!supplierEnquiry.viewedAt) {
      await prisma.supplierEnquiry.update({
        where: { id: supplierEnquiry.id },
        data: { viewedAt: new Date() },
      });
    }

    // Return enquiry summary (no contact details or pricing info)
    const enquiry = supplierEnquiry.enquiry;

    return NextResponse.json({
      status: "pending",
      supplierEnquiryId: supplierEnquiry.id,
      supplierName: supplierEnquiry.organisation.name,
      enquiry: {
        referenceNumber: enquiry.referenceNumber,
        tripType: enquiry.tripType,
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation,
        departureDate: enquiry.departureDate,
        departureTime: enquiry.departureTime,
        returnDate: enquiry.returnDate,
        returnTime: enquiry.returnTime,
        passengerCount: enquiry.passengerCount,
        vehicleType: enquiry.vehicleType,
        specialRequirements: enquiry.specialRequirements,
        additionalNotes: enquiry.additionalNotes,
        contactName: enquiry.contactName,
      },
    });
  } catch (error) {
    console.error("GET /api/bid/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/bid/[token]
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const supplierEnquiry = await findSupplierEnquiry(token);

    if (!supplierEnquiry) {
      return NextResponse.json(
        { error: "Bid request not found" },
        { status: 404 }
      );
    }

    if (isExpired(supplierEnquiry.expiresAt)) {
      return NextResponse.json(
        { error: "This bid request has expired" },
        { status: 410 }
      );
    }

    if (supplierEnquiry.supplierQuote) {
      return NextResponse.json(
        { error: "A bid has already been submitted for this request" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const validated = bidSchema.parse(body);

    const totalPrice =
      validated.basePrice +
      validated.fuelSurcharge +
      validated.tollCharges +
      validated.parkingCharges +
      validated.otherCharges;

    // Create the supplier quote
    const quote = await prisma.supplierQuote.create({
      data: {
        supplierEnquiryId: supplierEnquiry.id,
        organisationId: supplierEnquiry.organisationId,
        basePrice: validated.basePrice,
        fuelSurcharge: validated.fuelSurcharge,
        tollCharges: validated.tollCharges,
        parkingCharges: validated.parkingCharges,
        otherCharges: validated.otherCharges,
        totalPrice,
        currency: "GBP",
        vehicleOffered: validated.vehicleOffered,
        notes: validated.notes,
        validUntil: validated.validUntil
          ? new Date(validated.validUntil)
          : undefined,
        status: "SUBMITTED",
      },
    });

    // Update supplier enquiry status to SUBMITTED
    await prisma.supplierEnquiry.update({
      where: { id: supplierEnquiry.id },
      data: { status: "SUBMITTED" },
    });

    // Check if all supplier enquiries for this enquiry are resolved
    // (either submitted a quote or expired)
    const allSupplierEnquiries = await prisma.supplierEnquiry.findMany({
      where: { enquiryId: supplierEnquiry.enquiryId },
      include: { supplierQuote: true },
    });

    const allResolved = allSupplierEnquiries.every((se) => {
      const hasQuote = se.supplierQuote !== null;
      const hasExpired = se.expiresAt ? new Date() > se.expiresAt : false;
      return hasQuote || hasExpired;
    });

    if (allResolved) {
      await aiPipelineQueue.add("flow3:bid-evaluation", {
        enquiryId: supplierEnquiry.enquiryId,
      });
    }

    return NextResponse.json(
      {
        quote: {
          id: quote.id,
          basePrice: quote.basePrice,
          fuelSurcharge: quote.fuelSurcharge,
          tollCharges: quote.tollCharges,
          parkingCharges: quote.parkingCharges,
          otherCharges: quote.otherCharges,
          totalPrice: quote.totalPrice,
          currency: quote.currency,
          vehicleOffered: quote.vehicleOffered,
          notes: quote.notes,
          validUntil: quote.validUntil,
          createdAt: quote.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("POST /api/bid/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
