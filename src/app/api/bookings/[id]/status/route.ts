import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue, notificationQueue } from "@/lib/queue";
import { renderEmail } from "@/lib/email/render";

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (status === "COMPLETED") {
      const tripDetails = {
        pickupLocation: booking.enquiry?.pickupLocation ?? "",
        dropoffLocation: booking.enquiry?.dropoffLocation ?? "",
        departureDate: booking.enquiry?.departureDate?.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) ?? "",
      };

      // Email customer with completion + survey link using React Email template
      if (booking.enquiry?.contactEmail) {
        const surveyLink = `${baseUrl}/survey?booking=${booking.referenceNumber}`;
        const customerCompletionHtml = await renderEmail({
          type: "trip-completion",
          props: {
            recipientName: booking.enquiry.contactName,
            recipientType: "customer",
            bookingReference: booking.referenceNumber,
            tripDetails,
            surveyUrl: surveyLink,
          },
        });

        await emailQueue.add("send-email", {
          to: booking.enquiry.contactEmail,
          subject: `Booking ${booking.referenceNumber} – Trip Completed`,
          html: customerCompletionHtml,
        });
      }

      // Email supplier with completion confirmation using React Email template
      if (booking.organisation?.email) {
        const supplierCompletionHtml = await renderEmail({
          type: "trip-completion",
          props: {
            recipientName: booking.organisation.name,
            recipientType: "supplier",
            bookingReference: booking.referenceNumber,
            tripDetails,
          },
        });

        await emailQueue.add("send-email", {
          to: booking.organisation.email,
          subject: `Booking ${booking.referenceNumber} – Job Completed`,
          html: supplierCompletionHtml,
        });
      }
    }

    if (status === "CANCELLED") {
      const tripDetails = {
        pickupLocation: booking.enquiry?.pickupLocation ?? "",
        dropoffLocation: booking.enquiry?.dropoffLocation ?? "",
        departureDate: booking.enquiry?.departureDate?.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) ?? "",
      };

      // Email customer about cancellation using React Email template
      if (booking.enquiry?.contactEmail) {
        const customerCancellationHtml = await renderEmail({
          type: "booking-cancellation",
          props: {
            recipientName: booking.enquiry.contactName,
            recipientType: "customer",
            bookingReference: booking.referenceNumber,
            cancellationReason: cancellationReason ?? undefined,
            tripDetails,
            contactUrl: `${baseUrl}/contact`,
          },
        });

        await emailQueue.add("send-email", {
          to: booking.enquiry.contactEmail,
          subject: `Booking ${booking.referenceNumber} – Cancelled`,
          html: customerCancellationHtml,
        });
      }

      // Email supplier about cancellation using React Email template
      if (booking.organisation?.email) {
        const supplierCancellationHtml = await renderEmail({
          type: "booking-cancellation",
          props: {
            recipientName: booking.organisation.name,
            recipientType: "supplier",
            bookingReference: booking.referenceNumber,
            cancellationReason: cancellationReason ?? undefined,
            tripDetails,
          },
        });

        await emailQueue.add("send-email", {
          to: booking.organisation.email,
          subject: `Booking ${booking.referenceNumber} – Cancelled`,
          html: supplierCancellationHtml,
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
