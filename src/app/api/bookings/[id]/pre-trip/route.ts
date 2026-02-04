import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationQueue } from "@/lib/queue";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPPLIER (from booking's organisation) or ADMIN/SUPERADMIN
    if (!["SUPPLIER", "ADMIN", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Pre-trip data is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // SUPPLIER must belong to booking's organisation
    if (
      session.user.role === "SUPPLIER" &&
      booking.organisationId !== session.user.organisationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate booking status is SUPPLIER_ACCEPTED
    if (booking.status !== "SUPPLIER_ACCEPTED") {
      return NextResponse.json(
        {
          error: `Cannot submit pre-trip data for a booking with status "${booking.status}". Booking must be in SUPPLIER_ACCEPTED status.`,
        },
        { status: 400 }
      );
    }

    const previousStatus = booking.status;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          preTripData: body,
          preTripSubmittedAt: new Date(),
          status: "PRE_TRIP_READY",
        },
        include: {
          enquiry: true,
          customerQuote: true,
          organisation: {
            select: {
              id: true,
              name: true,
            },
          },
          vehicle: true,
          driver: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: previousStatus,
          toStatus: "PRE_TRIP_READY",
          changedById: session.user.id,
          notes: "Pre-trip data submitted",
        },
      });

      return updated;
    });

    // Queue notification to admin
    await notificationQueue.add("booking-pre-trip-submitted", {
      bookingId: id,
      organisationId: booking.organisationId,
      type: "PRE_TRIP_READY",
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking pre-trip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
