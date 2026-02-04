import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const booking = await prisma.booking.findUnique({
      where: { supplierAccessToken: token, deletedAt: null },
      include: {
        enquiry: {
          select: {
            referenceNumber: true,
            contactName: true,
            tripType: true,
            pickupLocation: true,
            pickupLat: true,
            pickupLng: true,
            dropoffLocation: true,
            dropoffLat: true,
            dropoffLng: true,
            departureDate: true,
            departureTime: true,
            returnDate: true,
            returnTime: true,
            passengerCount: true,
            vehicleType: true,
            specialRequirements: true,
            additionalNotes: true,
          },
        },
        organisation: {
          select: {
            name: true,
          },
        },
        vehicle: {
          select: {
            registrationNumber: true,
            type: true,
            capacity: true,
            features: true,
          },
        },
        driver: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Return booking with limited data — no pricing/financial info
    return NextResponse.json({
      id: booking.id,
      referenceNumber: booking.referenceNumber,
      status: booking.status,
      preTripData: booking.preTripData,
      preTripSubmittedAt: booking.preTripSubmittedAt,
      startedAt: booking.startedAt,
      completedAt: booking.completedAt,
      enquiry: booking.enquiry,
      organisation: booking.organisation,
      vehicle: booking.vehicle,
      driver: booking.driver,
    });
  } catch (error) {
    console.error("Booking by-token GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
