import { prisma } from "@/lib/prisma";
import { executeAiTask } from "../ai-service";
import { buildBidEvaluatorPrompt } from "../prompts/bid-evaluator";
import { bidEvaluatorSchema } from "../schemas/bid-evaluator.schema";
import { aiPipelineQueue } from "@/lib/queue";

const LOW_SUPPLIER_RATING_THRESHOLD = 3.0;

export async function runBidEvaluationPipeline(data: {
  enquiryId: string;
  pipelineId: string;
}) {
  const { enquiryId, pipelineId } = data;

  // Load the enquiry with its AI enrichment data
  const enquiry = await prisma.enquiry.findUniqueOrThrow({
    where: { id: enquiryId },
  });

  // Load all submitted supplier quotes for this enquiry
  const supplierEnquiries = await prisma.supplierEnquiry.findMany({
    where: { enquiryId },
    include: {
      supplierQuote: true,
      organisation: true,
    },
  });

  // Filter to only those with submitted quotes
  const bidsWithQuotes = supplierEnquiries.filter(
    (se) => se.supplierQuote !== null
  );

  if (bidsWithQuotes.length === 0) {
    console.warn(
      `[bid-evaluation] No submitted bids found for enquiry ${enquiryId}`
    );
    return { status: "no_bids", enquiryId };
  }

  // Check if any supplier has a low rating -- always escalate
  const hasLowRatedSupplier = bidsWithQuotes.some(
    (se) => (se.organisation.rating ?? 0) < LOW_SUPPLIER_RATING_THRESHOLD
  );

  // Build bid data for the AI evaluator
  const bidData = bidsWithQuotes.map((se) => ({
    id: se.supplierQuote!.id,
    supplierId: se.organisationId,
    supplierName: se.organisation.name,
    supplierRating: se.organisation.rating ?? 0,
    supplierCompletionRate: se.organisation.reliabilityScore ?? 0,
    supplierTotalBookings: se.organisation.totalJobsCompleted ?? 0,
    price: se.supplierQuote!.totalPrice,
    vehicleOffered: se.supplierQuote!.vehicleOffered ?? "Not specified",
    vehicleCapacity: 0, // Will be resolved from vehicle if linked
    notes: se.supplierQuote!.notes ?? undefined,
    submittedAt: se.supplierQuote!.createdAt.toISOString(),
  }));

  // Resolve vehicle capacity for bids that reference a vehicle
  for (const bid of bidData) {
    const matchingSE = bidsWithQuotes.find(
      (se) => se.supplierQuote!.id === bid.id
    );
    if (matchingSE?.supplierQuote?.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: matchingSE.supplierQuote.vehicleId },
      });
      if (vehicle) {
        bid.vehicleCapacity = vehicle.capacity;
      }
    }
  }

  // Step 1: Evaluate bids with AI
  const evaluationResult = await executeAiTask({
    taskType: "bid-evaluator",
    pipelineId,
    enquiryId,
    messages: buildBidEvaluatorPrompt({
      enquiry: {
        pickupLocation: enquiry.pickupLocation,
        dropoffLocation: enquiry.dropoffLocation ?? "TBC",
        departureDate:
          enquiry.departureDate?.toISOString() ?? new Date().toISOString(),
        passengerCount: enquiry.passengerCount,
        vehicleType: enquiry.vehicleType ?? "STANDARD_COACH",
        estimatedPriceRange: {
          min: enquiry.aiEstimatedPriceMin ?? 0,
          max: enquiry.aiEstimatedPriceMax ?? 0,
        },
      },
      bids: bidData,
    }),
    schema: bidEvaluatorSchema,
    schemaName: "BidEvaluatorOutput",
  });

  const { parsed } = evaluationResult;

  // Update each SupplierQuote with AI evaluation results
  for (const evalBid of parsed.evaluatedBids) {
    await prisma.supplierQuote.update({
      where: { id: evalBid.bidId },
      data: {
        aiFairnessScore: evalBid.fairnessScore,
        aiRanking: evalBid.rank,
        aiReasoning: evalBid.reasoning,
        aiAnomalyFlag: evalBid.anomalyFlag,
      },
    });
  }

  // Update enquiry status to reflect that quotes have been evaluated
  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: { status: "QUOTES_RECEIVED" },
  });

  // Determine if we should auto-select or escalate
  const shouldEscalate =
    !evaluationResult.autoExecuted ||
    parsed.hasAnomalies ||
    hasLowRatedSupplier;

  if (shouldEscalate) {
    // Build escalation reason
    const reasons: string[] = [];
    if (!evaluationResult.autoExecuted) {
      reasons.push("Low AI confidence in bid evaluation");
    }
    if (parsed.hasAnomalies) {
      reasons.push(`Pricing anomalies detected: ${parsed.anomalySummary ?? "Unknown"}`);
    }
    if (hasLowRatedSupplier) {
      reasons.push(
        `Supplier with rating below ${LOW_SUPPLIER_RATING_THRESHOLD} submitted a bid`
      );
    }

    const escalationReason = hasLowRatedSupplier
      ? "LOW_SUPPLIER_RATING"
      : parsed.hasAnomalies
        ? "ANOMALOUS_PRICING"
        : "LOW_CONFIDENCE";

    await prisma.humanReviewTask.create({
      data: {
        taskType: "BID_EVALUATOR",
        enquiryId,
        reason: escalationReason as
          | "LOW_CONFIDENCE"
          | "LOW_SUPPLIER_RATING"
          | "ANOMALOUS_PRICING",
        context: {
          evaluationResult: parsed,
          reasons,
          recommendedWinnerId: parsed.recommendedWinnerId,
        },
        status: "PENDING",
      },
    });

    console.info(
      `[bid-evaluation] Escalated to human review for enquiry ${enquiryId}: ${reasons.join("; ")}`
    );

    return {
      status: "escalated",
      enquiryId,
      reasons,
      recommendedWinnerId: parsed.recommendedWinnerId,
    };
  }

  // Auto-select: find the winning bid and update its status
  const winningBid = bidsWithQuotes.find(
    (se) => se.supplierQuote!.id === parsed.recommendedWinnerId
  );

  if (!winningBid || !winningBid.supplierQuote) {
    console.error(
      `[bid-evaluation] Recommended winner ${parsed.recommendedWinnerId} not found among bids for enquiry ${enquiryId}`
    );
    await prisma.humanReviewTask.create({
      data: {
        taskType: "BID_EVALUATOR",
        enquiryId,
        reason: "AI_FAILURE",
        context: {
          error: "Recommended winner bid not found",
          recommendedWinnerId: parsed.recommendedWinnerId,
          availableBidIds: bidsWithQuotes.map((se) => se.supplierQuote!.id),
        },
        status: "PENDING",
      },
    });
    return { status: "escalated", enquiryId, reason: "winner_not_found" };
  }

  // Accept the winning bid and reject the rest
  await prisma.supplierQuote.update({
    where: { id: winningBid.supplierQuote.id },
    data: { status: "ACCEPTED" },
  });

  const losingBidIds = bidsWithQuotes
    .filter((se) => se.supplierQuote!.id !== winningBid.supplierQuote!.id)
    .map((se) => se.supplierQuote!.id);

  if (losingBidIds.length > 0) {
    await prisma.supplierQuote.updateMany({
      where: { id: { in: losingBidIds } },
      data: { status: "REJECTED" },
    });
  }

  // Trigger the quote generation pipeline for the winning bid
  await aiPipelineQueue.add("quote-generation", {
    enquiryId,
    supplierQuoteId: winningBid.supplierQuote.id,
    supplierId: winningBid.organisationId,
    pipelineId: `quote-gen-${enquiryId}-${Date.now()}`,
  });

  console.info(
    `[bid-evaluation] Auto-selected winner for enquiry ${enquiryId}: bid ${winningBid.supplierQuote.id} from supplier ${winningBid.organisation.name}`
  );

  return {
    status: "completed",
    enquiryId,
    winnerId: winningBid.supplierQuote.id,
    winnerSupplierId: winningBid.organisationId,
    totalBidsEvaluated: bidsWithQuotes.length,
  };
}
