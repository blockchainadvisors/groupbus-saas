import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailQueue, notificationQueue } from "@/lib/queue";
import { renderEmail } from "@/lib/email/render";

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
      driverName: booking.driverName,
      driverPhone: booking.driverPhone,
    });
  } catch (error) {
    console.error("Booking by-token GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/by-token/[token]
 * Accept or reject a booking assignment (public access via token)
 * Body: { action: "accept" | "reject", driverName?: string, driverPhone?: string, reason?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { action, driverName, driverPhone, reason } = body;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Require driver name when accepting
    if (action === "accept" && !driverName?.trim()) {
      return NextResponse.json(
        { error: "Driver name is required when accepting a booking" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { supplierAccessToken: token, deletedAt: null },
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
          },
        },
        vehicle: {
          select: {
            registrationNumber: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only allow response if status is SUPPLIER_ASSIGNED
    if (booking.status !== "SUPPLIER_ASSIGNED") {
      return NextResponse.json(
        { error: `Cannot respond to booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    const previousStatus = booking.status;
    const newStatus = action === "accept" ? "SUPPLIER_ACCEPTED" : "SUPPLIER_REJECTED";

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: newStatus,
          ...(action === "accept" && {
            driverName: driverName?.trim(),
            driverPhone: driverPhone?.trim() || null,
          }),
        },
        include: {
          enquiry: true,
          organisation: {
            select: {
              id: true,
              name: true,
            },
          },
          vehicle: true,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: previousStatus,
          toStatus: newStatus,
          notes: action === "accept"
            ? `Supplier accepted booking. Driver: ${driverName}`
            : `Supplier rejected booking${reason ? `: ${reason}` : ""}`,
        },
      });

      return updated;
    });

    // Find admin email to notify about supplier response
    const adminUser = await prisma.user.findFirst({
      where: { role: { in: ["SUPERADMIN", "ADMIN"] }, isActive: true },
      select: { email: true },
    });

    if (adminUser?.email) {
      const actionLabel = action === "accept" ? "Accepted" : "Rejected";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const bookingUrl = `${baseUrl}/bookings/${booking.id}`;

      const responseEmailHtml = await renderEmail({
        type: "supplier-response",
        props: {
          supplierName: booking.organisation.name,
          bookingReference: booking.referenceNumber,
          action: action === "accept" ? "accepted" : "rejected",
          reason: action === "reject" && reason ? String(reason) : undefined,
          driverName: action === "accept" ? driverName : undefined,
          driverPhone: action === "accept" && driverPhone ? driverPhone : undefined,
          tripDetails: {
            pickupLocation: booking.enquiry.pickupLocation ?? "",
            dropoffLocation: booking.enquiry.dropoffLocation ?? "",
            departureDate: booking.enquiry.departureDate?.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }) ?? "",
          },
          bookingUrl,
        },
      });

      await emailQueue.add("send-email", {
        to: adminUser.email,
        subject: `Booking ${booking.referenceNumber} – Supplier ${actionLabel}`,
        html: responseEmailHtml,
      });
    }

    // Notify admin users in-app
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPERADMIN", "ADMIN"] }, isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      await notificationQueue.add("notification", {
        userId: admin.id,
        type: "BOOKING_UPDATE",
        title: `Supplier ${action === "accept" ? "Accepted" : "Rejected"}`,
        message: `${booking.organisation.name} ${action}ed booking ${booking.referenceNumber}${action === "accept" ? `. Driver: ${driverName}` : ""}`,
        link: `/bookings/${booking.id}`,
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      referenceNumber: booking.referenceNumber,
    });
  } catch (error) {
    console.error("Booking by-token POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
