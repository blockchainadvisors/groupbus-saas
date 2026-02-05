import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue, notificationQueue } from "@/lib/queue";

export async function POST(
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

    const { vehicleId, driverId } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: {
        enquiry: {
          select: {
            referenceNumber: true,
            contactName: true,
            pickupLocation: true,
            dropoffLocation: true,
            departureDate: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Validate vehicle belongs to booking's organisation
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (vehicle.organisationId !== booking.organisationId) {
      return NextResponse.json(
        { error: "Vehicle does not belong to the booking's organisation" },
        { status: 400 }
      );
    }

    // Validate driver belongs to booking's organisation (if provided)
    if (driverId) {
      const driver = await prisma.driverProfile.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 });
      }

      if (driver.organisationId !== booking.organisationId) {
        return NextResponse.json(
          { error: "Driver does not belong to the booking's organisation" },
          { status: 400 }
        );
      }
    }

    const previousStatus = booking.status;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          vehicleId,
          driverId: driverId ?? undefined,
          status: "SUPPLIER_ASSIGNED",
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
          toStatus: "SUPPLIER_ASSIGNED",
          changedById: session.user.id,
          notes: `Vehicle ${vehicle.registrationNumber} assigned${driverId ? " with driver" : ""}`,
        },
      });

      return updated;
    });

    // Queue notification email to supplier about the assignment
    await emailQueue.add("send-email", {
      to: booking.organisation?.email,
      subject: `Booking ${booking.referenceNumber} – Vehicle & Driver Assigned`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Vehicle & Driver Assigned</h2>
          <p>Dear ${booking.organisation?.name},</p>
          <p>Vehicle <strong>${vehicle.registrationNumber}</strong> has been assigned to booking <strong>${booking.referenceNumber}</strong>.</p>
          <p><strong>Trip:</strong> ${booking.enquiry?.pickupLocation} → ${booking.enquiry?.dropoffLocation}</p>
          <p><strong>Date:</strong> ${booking.enquiry?.departureDate?.toLocaleDateString("en-GB")}</p>
          <p>Please accept or reject this assignment in your supplier portal.</p>
          <p>Kind regards,<br/>GroupBus</p>
        </div>
      `.trim(),
    });

    // Notify admin users about the assignment
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPERADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      await notificationQueue.add("notification", {
        userId: admin.id,
        type: "BOOKING_UPDATE",
        title: "Supplier Assigned",
        message: `Vehicle ${vehicle.registrationNumber} assigned to booking ${booking.referenceNumber}`,
        link: `/bookings/${id}`,
      });
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking assign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
