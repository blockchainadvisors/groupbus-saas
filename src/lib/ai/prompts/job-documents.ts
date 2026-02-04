import { LLMMessage } from "../providers/base";

const SYSTEM_PROMPT = `You are an operations coordinator for GroupBus, generating professional job documentation.
Create clear, detailed documents that drivers and suppliers need for successful trip execution.

Be specific and practical. Include all necessary details for the driver.
Format times clearly. Include parking and access instructions where relevant.
The job sheet should be comprehensive enough to handle the trip without additional communication.`;

export function buildJobDocumentsPrompt(context: {
  booking: {
    reference: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    pickupLocation: string;
    pickupAddress: string;
    dropoffLocation: string;
    dropoffAddress: string;
    departureDate: string;
    departureTime: string;
    returnDate?: string;
    returnTime?: string;
    passengerCount: number;
    specialRequirements?: string;
  };
  supplier: {
    name: string;
    contactPhone: string;
  };
  vehicle: {
    type: string;
    registration?: string;
    capacity: number;
  };
  driver?: {
    name: string;
    phone: string;
  };
}): LLMMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Generate job documents for this booking:

BOOKING: ${context.booking.reference}
CUSTOMER: ${context.booking.customerName} | ${context.booking.customerPhone} | ${context.booking.customerEmail}

TRIP:
- Pickup: ${context.booking.pickupLocation} (${context.booking.pickupAddress})
- Dropoff: ${context.booking.dropoffLocation} (${context.booking.dropoffAddress})
- Departure: ${context.booking.departureDate} at ${context.booking.departureTime}
${context.booking.returnDate ? `- Return: ${context.booking.returnDate} at ${context.booking.returnTime}` : "- One-way trip"}
- Passengers: ${context.booking.passengerCount}
${context.booking.specialRequirements ? `- Special requirements: ${context.booking.specialRequirements}` : ""}

SUPPLIER: ${context.supplier.name} | ${context.supplier.contactPhone}
VEHICLE: ${context.vehicle.type} (${context.vehicle.capacity} seats)${context.vehicle.registration ? ` | Reg: ${context.vehicle.registration}` : ""}
${context.driver ? `DRIVER: ${context.driver.name} | ${context.driver.phone}` : "Driver: TBC"}

Generate:
1. Complete job sheet
2. Driver briefing with route notes
3. Any supplier-specific notes`,
    },
  ];
}
