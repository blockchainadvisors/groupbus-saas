import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  IN_PROGRESS: ["PRE_TRIP_READY", "SUPPLIER_ACCEPTED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: [
    "CONFIRMED",
    "SUPPLIER_ASSIGNED",
    "SUPPLIER_ACCEPTED",
    "SUPPLIER_REJECTED",
    "PRE_TRIP_READY",
    "IN_PROGRESS",
  ],
};

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

    const { status, notes, cancellationReason } = body;

    if (!status || !["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'IN_PROGRESS', 'COMPLETED', or 'CANCELLED'" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Validate status transition
    const allowedFromStatuses = VALID_TRANSITIONS[status];
    if (!allowedFromStatuses.includes(booking.status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from "${booking.status}" to "${status}". Allowed source statuses for "${status}": ${allowedFromStatuses.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };

    if (status === "IN_PROGRESS") {
      updateData.startedAt = new Date();
    } else if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (status === "CANCELLED") {
      updateData.cancelledAt = new Date();
      if (cancellationReason) {
        updateData.cancellationReason = cancellationReason;
      }
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
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

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus: booking.status,
          toStatus: status,
          changedById: session.user.id,
          notes: notes ?? cancellationReason ?? undefined,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
