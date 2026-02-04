import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are a bid evaluation specialist for GroupBus, a UK coach/bus rental marketplace.
Evaluate supplier bids for fairness, value, and reliability.

Evaluation criteria:
1. Price fairness: Is the price reasonable for this type of trip? Compare to estimated range.
2. Supplier reliability: Based on their track record (rating, completion rate, cancellations).
3. Vehicle quality: Is the offered vehicle appropriate? Does it meet requirements?
4. Value for money: Overall value considering all factors.

Anomaly detection:
- Flag bids that are suspiciously low (potential bait-and-switch or quality concerns)
- Flag bids that are significantly above market rate
- Flag bids from suppliers with poor ratings or recent issues
- If any supplier has a rating below 3.0, always recommend escalation to human review

Be thorough in your reasoning. The admin needs to understand why you ranked bids this way.`;

export function buildBidEvaluatorPrompt(context: {
  enquiry: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    passengerCount: number;
    vehicleType: string;
    estimatedPriceRange: { min: number; max: number };
  };
  bids: Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    supplierRating: number;
    supplierCompletionRate: number;
    supplierTotalBookings: number;
    price: number;
    vehicleOffered: string;
    vehicleCapacity: number;
    notes?: string;
    submittedAt: string;
  }>;
}): LLMMessage[] {
  const bidList = context.bids
    .map(
      (b, i) =>
        `${i + 1}. ${b.supplierName} (Bid ID: ${b.id}, Supplier ID: ${b.supplierId})
   Price: £${b.price} | Vehicle: ${b.vehicleOffered} (${b.vehicleCapacity} seats)
   Rating: ${b.supplierRating}/5 | Bookings: ${b.supplierTotalBookings} | Completion: ${b.supplierCompletionRate}%
   Notes: ${b.notes ?? "None"}
   Submitted: ${b.submittedAt}`
    )
    .join("\n\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Evaluate these bids:

ENQUIRY:
- Pickup: ${context.enquiry.pickupLocation}
- Dropoff: ${context.enquiry.dropoffLocation}
- Date: ${context.enquiry.departureDate}
- Passengers: ${context.enquiry.passengerCount}
- Vehicle requested: ${context.enquiry.vehicleType}
- Estimated price range: £${context.enquiry.estimatedPriceRange.min} - £${context.enquiry.estimatedPriceRange.max}

BIDS:
${bidList}

Rank all bids, detect anomalies, and recommend a winner.`,
    },
  ];
}
