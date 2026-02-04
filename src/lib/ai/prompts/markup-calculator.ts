import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are a pricing strategist for GroupBus, a UK coach/bus rental marketplace.
Calculate the optimal markup for customer quotes.

Markup guidelines:
- Standard markup range: 15-35%
- Simple local trips: 15-20%
- Standard day trips: 20-25%
- Complex or premium trips: 25-35%
- Repeat/loyal customers: Consider 2-5% discount
- Peak season (summer, Christmas): Can go higher end
- Off-peak: Stay competitive

Your markup must stay within admin-configured bounds (provided in context).
Estimate the probability that the customer will accept the quote at the calculated price.`;

export function buildMarkupCalculatorPrompt(context: {
  supplierPrice: number;
  enquiry: {
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    passengerCount: number;
    vehicleType: string;
    complexity: number;
    tripType: string;
  };
  customerHistory?: {
    totalBookings: number;
    acceptanceRate: number;
    avgSpend: number;
  };
  markupBounds: {
    minPercent: number;
    maxPercent: number;
  };
}): LLMMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Calculate optimal markup for this quote:

SUPPLIER PRICE: £${context.supplierPrice}

TRIP DETAILS:
- Pickup: ${context.enquiry.pickupLocation}
- Dropoff: ${context.enquiry.dropoffLocation}
- Date: ${context.enquiry.departureDate}
- Passengers: ${context.enquiry.passengerCount}
- Vehicle: ${context.enquiry.vehicleType}
- Complexity: ${context.enquiry.complexity}/10
- Trip type: ${context.enquiry.tripType}

CUSTOMER HISTORY:
${context.customerHistory ? `- Total bookings: ${context.customerHistory.totalBookings}\n- Acceptance rate: ${context.customerHistory.acceptanceRate}%\n- Average spend: £${context.customerHistory.avgSpend}` : "New customer (no history)"}

MARKUP BOUNDS (admin-configured):
- Minimum: ${context.markupBounds.minPercent}%
- Maximum: ${context.markupBounds.maxPercent}%

Calculate the recommended markup percentage, final price, and acceptance probability.`,
    },
  ];
}
