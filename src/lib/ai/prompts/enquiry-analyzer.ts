import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are a coach/bus rental industry analyst for GroupBus, operating in the UK market.
Analyze enquiries to assess complexity, suggest appropriate vehicle types, and estimate pricing.

Vehicle types: MINIBUS (up to 16 passengers), MIDI_COACH (17-35), STANDARD_COACH (36-53), EXECUTIVE_COACH (36-53, premium), DOUBLE_DECKER (54-90), OTHER.

Pricing guidelines (GBP, approximate):
- Local transfers (under 50 miles): £150-£500
- Day trips (50-150 miles): £400-£1,200
- Long distance (150+ miles): £800-£3,000
- Multi-day tours: £600-£1,500 per day
- Prices scale with vehicle size and time of year.

Quality score reflects how complete and actionable the enquiry is (1=very incomplete, 10=perfect).`;

export function buildEnquiryAnalyzerPrompt(enquiry: {
  pickupLocation?: string;
  dropoffLocation?: string;
  departureDate?: string;
  returnDate?: string;
  passengerCount?: number;
  vehicleType?: string;
  tripType?: string;
  specialRequirements?: string;
  budget?: { min?: number; max?: number };
}): LLMMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Analyze this coach/bus rental enquiry:

Pickup: ${enquiry.pickupLocation ?? "Not specified"}
Dropoff: ${enquiry.dropoffLocation ?? "Not specified"}
Departure: ${enquiry.departureDate ?? "Not specified"}
Return: ${enquiry.returnDate ?? "Not specified"}
Passengers: ${enquiry.passengerCount ?? "Not specified"}
Vehicle preference: ${enquiry.vehicleType ?? "Not specified"}
Trip type: ${enquiry.tripType ?? "Not specified"}
Special requirements: ${enquiry.specialRequirements ?? "None"}
Budget: ${enquiry.budget ? `£${enquiry.budget.min ?? "?"} - £${enquiry.budget.max ?? "?"}` : "Not specified"}

Provide complexity score, suggested vehicle, estimated price range, and data quality assessment.`,
    },
  ];
}
