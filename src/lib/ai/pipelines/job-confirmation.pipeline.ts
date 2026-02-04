import { prisma } from "@/lib/prisma";
import { executeAiTask } from "../ai-service";
import { buildJobDocumentsPrompt } from "../prompts/job-documents";
import { buildEmailPersonalizerPrompt } from "../prompts/email-personalizer";
import { jobDocumentsSchema } from "../schemas/job-documents.schema";
import { emailPersonalizerSchema } from "../schemas/email-personalizer.schema";
import { emailQueue, documentQueue } from "@/lib/queue";
import { generateAccessToken, generateReferenceNumber } from "@/lib/tokens";

export async function runJobConfirmationPipeline(data: {
  customerQuoteId: string;
  pipelineId: string;
}) {
  const { customerQuoteId, pipelineId } = data;

  // Load the accepted customer quote with all related data
  const customerQuote = await prisma.customerQuote.findUniqueOrThrow({
    where: { id: customerQuoteId },
    include: {
      enquiry: {
        include: {
          customer: true,
        },
      },
      supplierQuote: {
        include: {
          organisation: true,
          vehicle: true,
          supplierEnquiry: true,
        },
      },
    },
  });

  const { enquiry, supplierQuote } = customerQuote;
  const supplier = supplierQuote.organisation;

  // Create the booking record
  const year = new Date().getFullYear();
  const sequence = await prisma.sequence.upsert({
    where: { prefix_year: { prefix: "BKG", year } },
    update: { currentValue: { increment: 1 } },
    create: { prefix: "BKG", year, currentValue: 1 },
  });
  const bookingReference = generateReferenceNumber("BKG", sequence.currentValue);
  const supplierAccessToken = generateAccessToken();

  const booking = await prisma.booking.create({
    data: {
      referenceNumber: bookingReference,
      enquiryId: enquiry.id,
      customerQuoteId,
      organisationId: supplier.id,
      status: "CONFIRMED",
      supplierAccessToken,
      vehicleId: supplierQuote.vehicleId,
    },
  });

  // Record the initial booking status
  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      toStatus: "CONFIRMED",
      notes: "Booking auto-created from accepted customer quote",
    },
  });

  // Resolve vehicle details for the job documents
  let vehicleDetails = {
    type: supplierQuote.vehicleOffered ?? enquiry.vehicleType ?? "STANDARD_COACH",
    registration: undefined as string | undefined,
    capacity: 0,
  };

  if (supplierQuote.vehicle) {
    vehicleDetails = {
      type: supplierQuote.vehicle.type,
      registration: supplierQuote.vehicle.registrationNumber,
      capacity: supplierQuote.vehicle.capacity,
    };
  }

  // Find the supplier's primary contact
  const supplierContact = await prisma.user.findFirst({
    where: {
      organisationId: supplier.id,
      role: "SUPPLIER",
      isActive: true,
    },
  });

  const supplierContactPhone =
    supplierContact?.phone ?? supplier.phone ?? "TBC";

  // Step 1: Generate job documents (job sheet and driver briefing)
  const documentsResult = await executeAiTask({
    taskType: "job-documents",
    pipelineId,
    enquiryId: enquiry.id,
    bookingId: booking.id,
    messages: buildJobDocumentsPrompt({
      booking: {
        reference: bookingReference,
        customerName: enquiry.contactName,
        customerPhone: enquiry.contactPhone,
        customerEmail: enquiry.contactEmail,
        pickupLocation: enquiry.pickupLocation,
        pickupAddress: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        dropoffAddress: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toLocaleDateString("en-GB") ?? "TBC",
        departureTime: enquiry.departureTime ?? "TBC",
        returnDate: enquiry.returnDate?.toLocaleDateString("en-GB"),
        returnTime: enquiry.returnTime ?? undefined,
        passengerCount: enquiry.passengerCount,
        specialRequirements:
          enquiry.specialRequirements.length > 0
            ? enquiry.specialRequirements.join("; ")
            : undefined,
      },
      supplier: {
        name: supplier.name,
        contactPhone: supplierContactPhone,
      },
      vehicle: vehicleDetails,
    }),
    schema: jobDocumentsSchema,
    schemaName: "JobDocumentsOutput",
  });

  // Queue document generation jobs (PDFs for job sheet and driver briefing)
  await documentQueue.add("generate-job-sheet", {
    bookingId: booking.id,
    type: "JOB_SHEET",
    content: documentsResult.parsed.jobSheet,
    fileName: `job-sheet-${bookingReference}.pdf`,
  });

  await documentQueue.add("generate-driver-briefing", {
    bookingId: booking.id,
    type: "DRIVER_BRIEFING",
    content: documentsResult.parsed.driverBriefing,
    fileName: `driver-briefing-${bookingReference}.pdf`,
  });

  // Step 2: Personalize supplier confirmation email
  const emailResult = await executeAiTask({
    taskType: "email-personalizer",
    pipelineId,
    enquiryId: enquiry.id,
    bookingId: booking.id,
    messages: buildEmailPersonalizerPrompt({
      templateType: "supplier-booking-confirmation",
      recipientName: supplierContact
        ? `${supplierContact.firstName} ${supplierContact.lastName}`
        : supplier.name,
      recipientType: "supplier",
      context: {
        bookingReference,
        enquiryReference: enquiry.referenceNumber,
        customerName: enquiry.contactName,
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toLocaleDateString("en-GB") ?? "TBC",
        departureTime: enquiry.departureTime ?? "TBC",
        returnDate: enquiry.returnDate?.toLocaleDateString("en-GB") ?? "N/A",
        returnTime: enquiry.returnTime ?? "N/A",
        passengerCount: String(enquiry.passengerCount),
        vehicleType: vehicleDetails.type,
        agreedPrice: `${supplierQuote.totalPrice.toFixed(2)}`,
        supplierPortalLink: `${process.env.NEXT_PUBLIC_APP_URL}/supplier/booking/${supplierAccessToken}`,
      },
      urgency: "high",
    }),
    schema: emailPersonalizerSchema,
    schemaName: "EmailPersonalizerOutput",
  });

  // Queue the supplier confirmation email
  if (supplierContact) {
    await emailQueue.add("send-email", {
      to: supplierContact.email,
      subject: emailResult.parsed.subject,
      html: emailResult.parsed.body,
    });
  }

  // Send a confirmation email to the customer as well
  const customerEmailResult = await executeAiTask({
    taskType: "email-personalizer",
    pipelineId,
    enquiryId: enquiry.id,
    bookingId: booking.id,
    messages: buildEmailPersonalizerPrompt({
      templateType: "customer-booking-confirmation",
      recipientName: enquiry.contactName,
      recipientType: "customer",
      context: {
        bookingReference,
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toLocaleDateString("en-GB") ?? "TBC",
        departureTime: enquiry.departureTime ?? "TBC",
        passengerCount: String(enquiry.passengerCount),
        vehicleType: vehicleDetails.type,
        totalPaid: `${customerQuote.totalPrice.toFixed(2)}`,
        bookingLink: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingReference}`,
      },
    }),
    schema: emailPersonalizerSchema,
    schemaName: "EmailPersonalizerOutput",
  });

  await emailQueue.add("send-email", {
    to: enquiry.contactEmail,
    subject: customerEmailResult.parsed.subject,
    html: customerEmailResult.parsed.body,
  });

  // Update booking status to SUPPLIER_ASSIGNED
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "SUPPLIER_ASSIGNED" },
  });

  await prisma.bookingStatusHistory.create({
    data: {
      bookingId: booking.id,
      fromStatus: "CONFIRMED",
      toStatus: "SUPPLIER_ASSIGNED",
      notes: "Supplier notified via email with job documents",
    },
  });

  // Update the enquiry status to ACCEPTED
  await prisma.enquiry.update({
    where: { id: enquiry.id },
    data: { status: "ACCEPTED" },
  });

  console.info(
    `[job-confirmation] Pipeline completed for enquiry ${enquiry.id}: booking ${bookingReference} created, supplier ${supplier.name} notified`
  );

  return {
    status: "completed",
    enquiryId: enquiry.id,
    bookingId: booking.id,
    bookingReference,
    supplierId: supplier.id,
    supplierName: supplier.name,
  };
}
