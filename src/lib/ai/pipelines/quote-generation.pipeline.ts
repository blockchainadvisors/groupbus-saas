import { prisma } from "@/lib/prisma";
import { executeAiTask } from "../ai-service";
import { buildMarkupCalculatorPrompt } from "../prompts/markup-calculator";
import { buildQuoteContentPrompt } from "../prompts/quote-content";
import { buildEmailPersonalizerPrompt } from "../prompts/email-personalizer";
import { markupCalculatorSchema } from "../schemas/markup-calculator.schema";
import { quoteContentSchema } from "../schemas/quote-content.schema";
import { emailPersonalizerSchema } from "../schemas/email-personalizer.schema";
import { emailQueue } from "@/lib/queue";
import { generateReferenceNumber } from "@/lib/tokens";

const DEFAULT_MARKUP_BOUNDS = {
  minPercent: 15,
  maxPercent: 35,
};

const DEFAULT_VAT_RATE = 20;
const DEFAULT_QUOTE_VALIDITY_DAYS = 7;

export async function runQuoteGenerationPipeline(data: {
  enquiryId: string;
  supplierQuoteId: string;
  supplierId: string;
  pipelineId: string;
}) {
  const { enquiryId, supplierQuoteId, supplierId, pipelineId } = data;

  // Load the enquiry and winning supplier quote
  const enquiry = await prisma.enquiry.findUniqueOrThrow({
    where: { id: enquiryId },
    include: {
      customer: true,
    },
  });

  const supplierQuote = await prisma.supplierQuote.findUniqueOrThrow({
    where: { id: supplierQuoteId },
    include: {
      organisation: true,
      vehicle: true,
    },
  });

  // Load markup bounds from admin settings, falling back to defaults
  let markupBounds = DEFAULT_MARKUP_BOUNDS;
  try {
    const markupConfig = await prisma.setting.findUnique({
      where: { key: "markup_bounds" },
    });
    if (markupConfig?.value && typeof markupConfig.value === "object") {
      const configValue = markupConfig.value as Record<string, number>;
      markupBounds = {
        minPercent: configValue.minPercent ?? DEFAULT_MARKUP_BOUNDS.minPercent,
        maxPercent: configValue.maxPercent ?? DEFAULT_MARKUP_BOUNDS.maxPercent,
      };
    }
  } catch {
    // Use defaults if settings not available
  }

  // Load customer booking history for personalised pricing
  let customerHistory: {
    totalBookings: number;
    acceptanceRate: number;
    avgSpend: number;
  } | undefined;

  if (enquiry.customerId) {
    const previousBookings = await prisma.booking.count({
      where: {
        enquiry: { customerId: enquiry.customerId },
        status: { not: "CANCELLED" },
      },
    });

    const previousQuotes = await prisma.customerQuote.findMany({
      where: {
        enquiry: { customerId: enquiry.customerId },
      },
      select: { status: true, totalPrice: true },
    });

    const acceptedQuotes = previousQuotes.filter((q) => q.status === "ACCEPTED");
    const acceptanceRate =
      previousQuotes.length > 0
        ? (acceptedQuotes.length / previousQuotes.length) * 100
        : 0;
    const avgSpend =
      acceptedQuotes.length > 0
        ? acceptedQuotes.reduce((sum, q) => sum + q.totalPrice, 0) /
          acceptedQuotes.length
        : 0;

    if (previousBookings > 0 || previousQuotes.length > 0) {
      customerHistory = {
        totalBookings: previousBookings,
        acceptanceRate: Math.round(acceptanceRate),
        avgSpend: Math.round(avgSpend * 100) / 100,
      };
    }
  }

  // Step 1: Calculate markup
  const markupResult = await executeAiTask({
    taskType: "markup-calculator",
    pipelineId,
    enquiryId,
    messages: buildMarkupCalculatorPrompt({
      supplierPrice: supplierQuote.totalPrice,
      enquiry: {
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toISOString() ?? new Date().toISOString(),
        passengerCount: enquiry.passengerCount,
        vehicleType: enquiry.vehicleType ?? "STANDARD_COACH",
        complexity: enquiry.aiComplexityScore ?? 5,
        tripType: enquiry.tripType ?? "ONE_WAY",
      },
      customerHistory,
      markupBounds,
    }),
    schema: markupCalculatorSchema,
    schemaName: "MarkupCalculatorOutput",
  });

  // Ensure markup stays within configured bounds
  const clampedMarkupPercent = Math.min(
    Math.max(
      markupResult.parsed.recommendedMarkupPercent,
      markupBounds.minPercent
    ),
    markupBounds.maxPercent
  );
  const markupAmount =
    supplierQuote.totalPrice * (clampedMarkupPercent / 100);
  const subtotal = supplierQuote.totalPrice + markupAmount;
  const vatAmount = subtotal * (DEFAULT_VAT_RATE / 100);
  const totalPrice = subtotal + vatAmount;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + DEFAULT_QUOTE_VALIDITY_DAYS);

  // Step 2: Generate quote content (branded description and email)
  const contentResult = await executeAiTask({
    taskType: "quote-content",
    pipelineId,
    enquiryId,
    messages: buildQuoteContentPrompt({
      enquiry: {
        customerName: enquiry.contactName,
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toLocaleDateString("en-GB") ?? "TBC",
        returnDate: enquiry.returnDate?.toLocaleDateString("en-GB"),
        passengerCount: enquiry.passengerCount,
        tripType: enquiry.tripType ?? "ONE_WAY",
      },
      quote: {
        vehicleType:
          supplierQuote.vehicleOffered ??
          enquiry.vehicleType ??
          "STANDARD_COACH",
        totalPrice: Math.round(totalPrice * 100) / 100,
        validUntil: validUntil.toLocaleDateString("en-GB"),
      },
      supplierName: supplierQuote.organisation.name,
    }),
    schema: quoteContentSchema,
    schemaName: "QuoteContentOutput",
  });

  // Create the CustomerQuote record
  const year = new Date().getFullYear();
  const sequence = await prisma.sequence.upsert({
    where: { prefix_year: { prefix: "QTE", year } },
    update: { currentValue: { increment: 1 } },
    create: { prefix: "QTE", year, currentValue: 1 },
  });
  const quoteReferenceNumber = generateReferenceNumber(
    "QTE",
    sequence.currentValue
  );

  const customerQuote = await prisma.customerQuote.create({
    data: {
      referenceNumber: quoteReferenceNumber,
      enquiryId,
      supplierQuoteId,
      supplierPrice: supplierQuote.totalPrice,
      markupPercentage: clampedMarkupPercent,
      markupAmount: Math.round(markupAmount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      vatRate: DEFAULT_VAT_RATE,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      validUntil,
      status: "DRAFT",
      aiMarkupReasoning: markupResult.parsed.reasoning,
      aiAcceptanceProbability: markupResult.parsed.acceptanceProbability,
      aiDescription: contentResult.parsed.quoteDescription,
      aiEmailBody: contentResult.parsed.emailBody,
    },
  });

  // Step 3: Personalize the quote email for the customer
  const emailResult = await executeAiTask({
    taskType: "email-personalizer",
    pipelineId,
    enquiryId,
    quoteId: customerQuote.id,
    messages: buildEmailPersonalizerPrompt({
      templateType: "customer-quote",
      recipientName: enquiry.contactName,
      recipientType: "customer",
      context: {
        quoteReference: quoteReferenceNumber,
        enquiryReference: enquiry.referenceNumber,
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toLocaleDateString("en-GB") ?? "TBC",
        passengerCount: String(enquiry.passengerCount),
        vehicleType:
          supplierQuote.vehicleOffered ??
          enquiry.vehicleType ??
          "STANDARD_COACH",
        totalPrice: `${(Math.round(totalPrice * 100) / 100).toFixed(2)}`,
        validUntil: validUntil.toLocaleDateString("en-GB"),
        quoteLink: `${process.env.NEXT_PUBLIC_APP_URL}/quote/${customerQuote.acceptanceToken}`,
      },
    }),
    schema: emailPersonalizerSchema,
    schemaName: "EmailPersonalizerOutput",
  });

  // Queue the quote email to the customer
  await emailQueue.add("send-email", {
    to: enquiry.contactEmail,
    subject: emailResult.parsed.subject,
    html: emailResult.parsed.body,
  });

  // Update the customer quote to SENT_TO_CUSTOMER
  await prisma.customerQuote.update({
    where: { id: customerQuote.id },
    data: {
      status: "SENT_TO_CUSTOMER",
      sentAt: new Date(),
    },
  });

  // Update enquiry status
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: "QUOTE_SENT" },
  });

  console.info(
    `[quote-generation] Pipeline completed for enquiry ${enquiryId}: quote ${quoteReferenceNumber} sent to ${enquiry.contactEmail} (total: ${totalPrice.toFixed(2)} GBP)`
  );

  return {
    status: "completed",
    enquiryId,
    customerQuoteId: customerQuote.id,
    quoteReference: quoteReferenceNumber,
    totalPrice: Math.round(totalPrice * 100) / 100,
    markupPercent: clampedMarkupPercent,
    acceptanceProbability: markupResult.parsed.acceptanceProbability,
  };
}
