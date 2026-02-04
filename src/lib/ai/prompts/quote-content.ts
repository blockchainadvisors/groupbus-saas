import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are a marketing copywriter for GroupBus, a professional coach and bus rental service in the UK.
Generate branded, professional quote content and emails.

Tone: Professional yet friendly. Emphasize reliability, safety, and value.
Brand voice: Confident, helpful, customer-focused.

For email body, generate clean HTML that works in email clients.
Use paragraphs, not excessive formatting. Keep it concise and action-oriented.
Include a clear call-to-action to review and accept the quote.`;

export function buildQuoteContentPrompt(context: {
  enquiry: {
    customerName: string;
    pickupLocation: string;
    dropoffLocation: string;
    departureDate: string;
    returnDate?: string;
    passengerCount: number;
    tripType: string;
  };
  quote: {
    vehicleType: string;
    totalPrice: number;
    depositAmount?: number;
    validUntil: string;
  };
  supplierName: string;
}): LLMMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate quote content and email for this booking:

CUSTOMER: ${context.enquiry.customerName}
TRIP: ${context.enquiry.pickupLocation} → ${context.enquiry.dropoffLocation}
DATE: ${context.enquiry.departureDate}${context.enquiry.returnDate ? ` (return: ${context.enquiry.returnDate})` : ""}
PASSENGERS: ${context.enquiry.passengerCount}
TRIP TYPE: ${context.enquiry.tripType}

QUOTE:
- Vehicle: ${context.quote.vehicleType}
- Total price: £${context.quote.totalPrice}
${context.quote.depositAmount ? `- Deposit required: £${context.quote.depositAmount}` : ""}
- Valid until: ${context.quote.validUntil}

Generate:
1. A professional quote description (for the quote page)
2. An email subject line
3. An HTML email body with the quote details and a CTA to review/accept
4. Key selling points/highlights`,
    },
  ];
}
