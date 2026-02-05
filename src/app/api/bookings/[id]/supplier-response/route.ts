import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue, notificationQueue } from "@/lib/queue";
import { renderEmail } from "@/lib/email/render";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPPLIER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const { action, reason } = body;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'accept' or 'reject'" },
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
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify supplier belongs to the booking's organisation
    if (booking.organisationId !== session.user.organisationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const previousStatus = booking.status;
    const newStatus = action === "accept" ? "SUPPLIER_ACCEPTED" : "SUPPLIER_REJECTED";

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: newStatus,
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
          toStatus: newStatus,
          changedById: session.user.id,
          notes: reason ?? (action === "accept" ? "Supplier accepted booking" : "Supplier rejected booking"),
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
      const bookingUrl = `${baseUrl}/bookings/${id}`;

      const responseEmailHtml = await renderEmail({
        type: "supplier-response",
        props: {
          supplierName: booking.organisation.name,
          bookingReference: booking.referenceNumber,
          action: action === "accept" ? "accepted" : "rejected",
          reason: action === "reject" && reason ? String(reason) : undefined,
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
        message: `${booking.organisation.name} ${action}ed booking ${booking.referenceNumber}`,
        link: `/bookings/${id}`,
      });
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking supplier-response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
