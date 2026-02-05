import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue, notificationQueue } from "@/lib/queue";

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
        organisation: {
          select: {
            name: true,
            email: true,
          },
        },
      },
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

    // Send status-change emails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.groupbus.co.uk";

    if (status === "COMPLETED") {
      // Email customer with completion + survey link
      if (booking.enquiry?.contactEmail) {
        const surveyLink = `${baseUrl}/survey?booking=${booking.referenceNumber}`;
        await emailQueue.add("send-email", {
          to: booking.enquiry.contactEmail,
          subject: `Booking ${booking.referenceNumber} – Trip Completed`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Your Trip is Complete</h2>
              <p>Dear ${booking.enquiry.contactName},</p>
              <p>We hope you had a great journey! Your booking <strong>${booking.referenceNumber}</strong> has been marked as completed.</p>
              <p><strong>Trip:</strong> ${booking.enquiry.pickupLocation} → ${booking.enquiry.dropoffLocation}</p>
              <p>We would love to hear about your experience. Please take a moment to complete our short survey:</p>
              <p style="margin-top: 16px;">
                <a href="${surveyLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Complete Survey
                </a>
              </p>
              <p>Kind regards,<br/>GroupBus</p>
            </div>
          `.trim(),
        });
      }

      // Email supplier with completion confirmation
      if (booking.organisation?.email) {
        await emailQueue.add("send-email", {
          to: booking.organisation.email,
          subject: `Booking ${booking.referenceNumber} – Job Completed`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Job Completed</h2>
              <p>Dear ${booking.organisation.name},</p>
              <p>Booking <strong>${booking.referenceNumber}</strong> has been marked as completed. Thank you for your service.</p>
              <p><strong>Trip:</strong> ${booking.enquiry?.pickupLocation} → ${booking.enquiry?.dropoffLocation}</p>
              <p><strong>Date:</strong> ${booking.enquiry?.departureDate?.toLocaleDateString("en-GB")}</p>
              <p>Kind regards,<br/>GroupBus</p>
            </div>
          `.trim(),
        });
      }
    }

    if (status === "CANCELLED") {
      const cancelReason = cancellationReason
        ? `<p><strong>Reason:</strong> ${cancellationReason}</p>`
        : "";

      // Email customer about cancellation
      if (booking.enquiry?.contactEmail) {
        await emailQueue.add("send-email", {
          to: booking.enquiry.contactEmail,
          subject: `Booking ${booking.referenceNumber} – Cancelled`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Booking Cancelled</h2>
              <p>Dear ${booking.enquiry.contactName},</p>
              <p>We regret to inform you that booking <strong>${booking.referenceNumber}</strong> has been cancelled.</p>
              ${cancelReason}
              <p><strong>Trip:</strong> ${booking.enquiry.pickupLocation} → ${booking.enquiry.dropoffLocation}</p>
              <p>If you have any questions or would like to rebook, please don't hesitate to contact us.</p>
              <p>Kind regards,<br/>GroupBus</p>
            </div>
          `.trim(),
        });
      }

      // Email supplier about cancellation
      if (booking.organisation?.email) {
        await emailQueue.add("send-email", {
          to: booking.organisation.email,
          subject: `Booking ${booking.referenceNumber} – Cancelled`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Booking Cancelled</h2>
              <p>Dear ${booking.organisation.name},</p>
              <p>Booking <strong>${booking.referenceNumber}</strong> has been cancelled and no longer requires your service.</p>
              ${cancelReason}
              <p><strong>Trip:</strong> ${booking.enquiry?.pickupLocation} → ${booking.enquiry?.dropoffLocation}</p>
              <p>Kind regards,<br/>GroupBus</p>
            </div>
          `.trim(),
        });
      }
    }

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error("Booking status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
