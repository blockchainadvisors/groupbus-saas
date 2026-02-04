import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
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
        documents: {
          orderBy: { createdAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
        surveyResponses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Role-based access check
    if (
      session.user.role === "CLIENT" &&
      booking.enquiry.customerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      session.user.role === "SUPPLIER" &&
      booking.organisationId !== session.user.organisationId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Booking GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
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
    const body = await request.json();

    const existingBooking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const statusHistoryEntries: Array<{
      bookingId: string;
      fromStatus: BookingStatus;
      toStatus: BookingStatus;
      changedById: string;
      notes?: string;
    }> = [];

    if (body.vehicleId !== undefined) {
      updateData.vehicleId = body.vehicleId;
    }

    if (body.driverId !== undefined) {
      updateData.driverId = body.driverId;
    }

    // If cancellationReason is provided, cancel the booking
    if (body.cancellationReason !== undefined) {
      updateData.status = "CANCELLED";
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = body.cancellationReason;

      statusHistoryEntries.push({
        bookingId: id,
        fromStatus: existingBooking.status,
        toStatus: "CANCELLED",
        changedById: session.user.id,
        notes: body.cancellationReason,
      });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id },
        data: updateData,
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

      if (statusHistoryEntries.length > 0) {
        await tx.bookingStatusHistory.createMany({
          data: statusHistoryEntries,
        });
      }

      return booking;
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
