import { prisma } from "@/lib/prisma";
import { executeAiTask } from "../ai-service";
import { buildEmailParserPrompt } from "../prompts/email-parser";
import { buildEnquiryAnalyzerPrompt } from "../prompts/enquiry-analyzer";
import { buildSupplierSelectorPrompt } from "../prompts/supplier-selector";
import { buildEmailPersonalizerPrompt } from "../prompts/email-personalizer";
import { emailParserSchema } from "../schemas/email-parser.schema";
import { enquiryAnalyzerSchema } from "../schemas/enquiry-analyzer.schema";
import { supplierSelectorSchema } from "../schemas/supplier-selector.schema";
import { emailPersonalizerSchema } from "../schemas/email-personalizer.schema";
import { emailQueue } from "@/lib/queue";
import { generateAccessToken, generateReferenceNumber } from "@/lib/tokens";

export async function runEnquiryIntakePipeline(data: {
  enquiryId?: string;
  inboundEmailId?: string;
  pipelineId: string;
}) {
  let enquiryId = data.enquiryId;

  // Step 1: If from inbound email, parse it first
  if (data.inboundEmailId && !enquiryId) {
    const inboundEmail = await prisma.inboundEmail.findUniqueOrThrow({
      where: { id: data.inboundEmailId },
    });

    const result = await executeAiTask({
      taskType: "email-parser",
      pipelineId: data.pipelineId,
      messages: buildEmailParserPrompt({
        subject: inboundEmail.subject,
        body: inboundEmail.body,
        fromEmail: inboundEmail.fromEmail,
        fromName: inboundEmail.fromName ?? undefined,
      }),
      schema: emailParserSchema,
      schemaName: "EmailParserOutput",
    });

    if (!result.autoExecuted) {
      await prisma.humanReviewTask.create({
        data: {
          taskType: "EMAIL_PARSER",
          reason: "LOW_CONFIDENCE",
          context: {
            inboundEmailId: data.inboundEmailId,
            aiOutput: result.parsed,
          },
          status: "PENDING",
        },
      });
      await prisma.inboundEmail.update({
        where: { id: data.inboundEmailId },
        data: { processed: true, processedAt: new Date() },
      });
      return { status: "escalated", reason: "low_confidence_email_parse" };
    }

    // Auto-create enquiry from parsed email
    const parsed = result.parsed;

    // Try to find existing customer by email
    let customerId: string | undefined;
    if (parsed.parsedEnquiry.customerEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: parsed.parsedEnquiry.customerEmail },
      });
      if (existingUser) {
        customerId = existingUser.id;
      }
    }

    // Get the next sequence number for the reference
    const year = new Date().getFullYear();
    const sequence = await prisma.sequence.upsert({
      where: { prefix_year: { prefix: "ENQ", year } },
      update: { currentValue: { increment: 1 } },
      create: { prefix: "ENQ", year, currentValue: 1 },
    });
    const referenceNumber = generateReferenceNumber("ENQ", sequence.currentValue);

    const enquiry = await prisma.enquiry.create({
      data: {
        referenceNumber,
        customerId: customerId ?? "",
        pickupLocation: parsed.parsedEnquiry.pickupLocation ?? "TBC",
        dropoffLocation: parsed.parsedEnquiry.dropoffLocation ?? "TBC",
        departureDate: parsed.parsedEnquiry.departureDate
          ? new Date(parsed.parsedEnquiry.departureDate)
          : new Date(),
        returnDate: parsed.parsedEnquiry.returnDate
          ? new Date(parsed.parsedEnquiry.returnDate)
          : undefined,
        departureTime: parsed.parsedEnquiry.departureTime,
        returnTime: parsed.parsedEnquiry.returnTime,
        passengerCount: parsed.parsedEnquiry.passengerCount ?? 0,
        vehicleType:
          (parsed.parsedEnquiry.vehicleType as
            | "MINIBUS"
            | "STANDARD_COACH"
            | "EXECUTIVE_COACH"
            | "DOUBLE_DECKER"
            | "MIDI_COACH"
            | "OTHER") ?? "STANDARD_COACH",
        tripType: parsed.parsedEnquiry.tripType ?? "ONE_WAY",
        specialRequirements: parsed.parsedEnquiry.specialRequirements
          ? [parsed.parsedEnquiry.specialRequirements]
          : [],
        budgetMin: parsed.parsedEnquiry.budgetMin,
        budgetMax: parsed.parsedEnquiry.budgetMax,
        source: "EMAIL",
        status: "SUBMITTED",
        contactName:
          parsed.parsedEnquiry.customerName ?? inboundEmail.fromName ?? "Unknown",
        contactEmail:
          parsed.parsedEnquiry.customerEmail ?? inboundEmail.fromEmail,
        contactPhone: parsed.parsedEnquiry.customerPhone ?? "",
        companyName: parsed.parsedEnquiry.companyName,
      },
    });

    enquiryId = enquiry.id;

    await prisma.inboundEmail.update({
      where: { id: data.inboundEmailId },
      data: { processed: true, processedAt: new Date(), enquiryId },
    });
  }

  if (!enquiryId) {
    throw new Error("No enquiry ID provided or created");
  }

  // Step 2: Analyze the enquiry
  const enquiry = await prisma.enquiry.findUniqueOrThrow({
    where: { id: enquiryId },
  });

  const analyzerResult = await executeAiTask({
    taskType: "enquiry-analyzer",
    pipelineId: data.pipelineId,
    enquiryId,
    messages: buildEnquiryAnalyzerPrompt({
      pickupLocation: enquiry.pickupLocation,
      dropoffLocation: enquiry.dropoffLocation ?? undefined,
      departureDate: enquiry.departureDate?.toISOString(),
      returnDate: enquiry.returnDate?.toISOString(),
      passengerCount: enquiry.passengerCount,
      vehicleType: enquiry.vehicleType ?? undefined,
      tripType: enquiry.tripType ?? undefined,
      specialRequirements:
        enquiry.specialRequirements.length > 0
          ? enquiry.specialRequirements.join("; ")
          : undefined,
      budget:
        enquiry.budgetMin || enquiry.budgetMax
          ? {
              min: enquiry.budgetMin ?? undefined,
              max: enquiry.budgetMax ?? undefined,
            }
          : undefined,
    }),
    schema: enquiryAnalyzerSchema,
    schemaName: "EnquiryAnalyzerOutput",
  });

  // Update enquiry with AI enrichment
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      aiComplexityScore: analyzerResult.parsed.complexityScore,
      aiSuggestedVehicle: analyzerResult.parsed.suggestedVehicleType,
      aiEstimatedPriceMin: analyzerResult.parsed.estimatedPriceMin,
      aiEstimatedPriceMax: analyzerResult.parsed.estimatedPriceMax,
      aiQualityScore: analyzerResult.parsed.qualityScore,
      status: "UNDER_REVIEW",
    },
  });

  // Step 3: Select suppliers
  const suppliers = await prisma.organisation.findMany({
    where: {
      type: "SUPPLIER",
      isActive: true,
    },
    include: {
      vehicles: true,
    },
  });

  if (suppliers.length === 0) {
    console.warn(`[enquiry-intake] No active suppliers found for enquiry ${enquiryId}`);
    return { status: "no_suppliers", enquiryId };
  }

  const supplierData = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    rating: s.rating ?? 0,
    totalBookings: s.totalJobsCompleted ?? 0,
    completionRate: s.reliabilityScore ?? 0,
    avgResponseTimeHours: 24, // TODO: calculate from historical data
    distanceFromPickupKm: 50, // TODO: calculate from geocoordinates
    hasMatchingVehicle: s.vehicles.some(
      (v) => v.type === (enquiry.vehicleType ?? "STANDARD_COACH")
    ),
    vehicleTypes: [...new Set(s.vehicles.map((v) => v.type))],
    avgPriceIndex: 1.0,
    complianceStatus: "valid",
    recentCancellations: 0,
  }));

  const selectorResult = await executeAiTask({
    taskType: "supplier-selector",
    pipelineId: data.pipelineId,
    enquiryId,
    messages: buildSupplierSelectorPrompt({
      enquiry: {
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toISOString() ?? new Date().toISOString(),
        passengerCount: enquiry.passengerCount,
        vehicleType: enquiry.vehicleType ?? "STANDARD_COACH",
        complexity: analyzerResult.parsed.complexityScore,
        estimatedPriceRange: {
          min: analyzerResult.parsed.estimatedPriceMin,
          max: analyzerResult.parsed.estimatedPriceMax,
        },
      },
      suppliers: supplierData,
    }),
    schema: supplierSelectorSchema,
    schemaName: "SupplierSelectorOutput",
  });

  if (!selectorResult.autoExecuted) {
    await prisma.humanReviewTask.create({
      data: {
        taskType: "SUPPLIER_SELECTOR",
        enquiryId,
        reason: "LOW_CONFIDENCE",
        context: { aiOutput: selectorResult.parsed },
        status: "PENDING",
      },
    });
    return {
      status: "escalated",
      reason: "supplier_selection_low_confidence",
      enquiryId,
    };
  }

  // Step 4: Create SupplierEnquiry records and send personalized emails
  const topSuppliers = selectorResult.parsed.rankedSuppliers.slice(
    0,
    selectorResult.parsed.recommendedCount
  );

  let suppliersContacted = 0;

  for (const ranked of topSuppliers) {
    const supplier = suppliers.find((s) => s.id === ranked.supplierId);
    if (!supplier) continue;

    const accessToken = generateAccessToken();

    await prisma.supplierEnquiry.create({
      data: {
        enquiryId,
        organisationId: ranked.supplierId,
        accessToken,
        status: "PENDING",
        aiRank: ranked.rank,
        aiScore: ranked.compositeScore,
        aiReasoning: ranked.reasoning,
      },
    });

    // Get primary contact for this supplier
    const supplierContact = await prisma.user.findFirst({
      where: {
        organisationId: ranked.supplierId,
        role: "SUPPLIER",
        isActive: true,
      },
    });

    if (supplierContact) {
      // Personalize email for each supplier
      const emailResult = await executeAiTask({
        taskType: "email-personalizer",
        pipelineId: data.pipelineId,
        enquiryId,
        messages: buildEmailPersonalizerPrompt({
          templateType: "supplier-bid-request",
          recipientName: `${supplierContact.firstName} ${supplierContact.lastName}`,
          recipientType: "supplier",
          context: {
            enquiryReference: enquiry.referenceNumber,
            pickupLocation: enquiry.pickupLocation,
            dropoffLocation: enquiry.dropoffLocation ?? "TBC",
            departureDate:
              enquiry.departureDate?.toLocaleDateString("en-GB") ?? "TBC",
            passengerCount: String(enquiry.passengerCount),
            vehicleType: enquiry.vehicleType ?? "STANDARD_COACH",
            bidLink: `${process.env.NEXT_PUBLIC_APP_URL}/bid/${accessToken}`,
          },
        }),
        schema: emailPersonalizerSchema,
        schemaName: "EmailPersonalizerOutput",
      });

      await emailQueue.add("send-email", {
        to: supplierContact.email,
        subject: emailResult.parsed.subject,
        html: emailResult.parsed.body,
      });

      suppliersContacted++;
    }
  }

  // Update enquiry status
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: "SENT_TO_SUPPLIERS" },
  });

  console.info(
    `[enquiry-intake] Pipeline completed for enquiry ${enquiryId}: ${suppliersContacted} suppliers contacted`
  );

  return { status: "completed", enquiryId, suppliersContacted };
}
