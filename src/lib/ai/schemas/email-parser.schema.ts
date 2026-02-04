import { z } from "zod";

export const emailParserSchema = z.object({
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("Overall confidence in the parsing quality"),
  parsedEnquiry: z.object({
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    companyName: z.string().optional(),
    pickupLocation: z.string().optional(),
    dropoffLocation: z.string().optional(),
    departureDate: z.string().optional(),
    returnDate: z.string().optional(),
    departureTime: z.string().optional(),
    returnTime: z.string().optional(),
    passengerCount: z.number().optional(),
    tripType: z.enum(["ONE_WAY", "RETURN", "MULTI_STOP"]).optional(),
    vehicleType: z.string().optional(),
    specialRequirements: z.string().optional(),
    budgetMin: z.number().optional(),
    budgetMax: z.number().optional(),
  }),
  missingFields: z
    .array(z.string())
    .describe("Fields that could not be extracted"),
  summary: z.string().describe("Brief summary of the enquiry"),
});

export type EmailParserOutput = z.infer<typeof emailParserSchema>;
