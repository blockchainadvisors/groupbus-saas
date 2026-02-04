import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are a supplier selection specialist for GroupBus, a UK coach/bus rental marketplace.
Your job is to rank suppliers based on multiple weighted factors to find the best matches for each enquiry.

Evaluation criteria (all scored 0-100):
1. Rating: Overall customer rating and review quality
2. Price competitiveness: Historical pricing compared to market
3. Reliability: On-time performance, cancellation rate
4. Proximity: Distance from pickup location (closer = better)
5. Response time: Average time to respond to bid requests
6. Fleet match: Whether they have the right vehicle type/size

Risk flags to watch for:
- Expired compliance documents
- Rating below 3.0 (always flag)
- Recent cancellations
- New supplier with no track record

Always explain your reasoning for each ranking.`;

export function buildSupplierSelectorPrompt(context: {
  enquiry: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    passengerCount: number;
    vehicleType: string;
    complexity: number;
    estimatedPriceRange: { min: number; max: number };
  };
  suppliers: Array<{
    id: string;
    name: string;
    rating: number;
    totalBookings: number;
    completionRate: number;
    avgResponseTimeHours: number;
    distanceFromPickupKm: number;
    hasMatchingVehicle: boolean;
    vehicleTypes: string[];
    avgPriceIndex: number;
    complianceStatus: string;
    recentCancellations: number;
  }>;
}): LLMMessage[] {
  const supplierList = context.suppliers
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} (ID: ${s.id})
   Rating: ${s.rating}/5 | Bookings: ${s.totalBookings} | Completion: ${s.completionRate}%
   Response time: ${s.avgResponseTimeHours}h | Distance: ${s.distanceFromPickupKm}km
   Vehicle match: ${s.hasMatchingVehicle ? "Yes" : "No"} | Fleet: ${s.vehicleTypes.join(", ")}
   Price index: ${s.avgPriceIndex} | Compliance: ${s.complianceStatus}
   Recent cancellations: ${s.recentCancellations}`
    )
    .join("\n\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Select and rank suppliers for this enquiry:

ENQUIRY:
- Pickup: ${context.enquiry.pickupLocation}
- Dropoff: ${context.enquiry.dropoffLocation}
- Date: ${context.enquiry.departureDate}
- Passengers: ${context.enquiry.passengerCount}
- Vehicle: ${context.enquiry.vehicleType}
- Complexity: ${context.enquiry.complexity}/10
- Estimated price: £${context.enquiry.estimatedPriceRange.min} - £${context.enquiry.estimatedPriceRange.max}

AVAILABLE SUPPLIERS:
${supplierList}

Rank all suitable suppliers and recommend how many to contact.`,
    },
  ];
}
