import { z } from "zod";

export const enquiryAnalyzerSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  complexityScore: z
    .number()
    .min(1)
    .max(10)
    .describe("1=simple transfer, 10=multi-day complex tour"),
  suggestedVehicleType: z.enum([
    "MINIBUS",
    "STANDARD_COACH",
    "EXECUTIVE_COACH",
    "DOUBLE_DECKER",
    "MIDI_COACH",
    "OTHER",
  ]),
  vehicleReasoning: z.string(),
  estimatedPriceMin: z
    .number()
    .describe("Estimated minimum price in GBP"),
  estimatedPriceMax: z
    .number()
    .describe("Estimated maximum price in GBP"),
  priceReasoning: z.string(),
  qualityScore: z
    .number()
    .min(1)
    .max(10)
    .describe("Quality/completeness of the enquiry data"),
  qualityNotes: z.string(),
  suggestedSupplierCount: z
    .number()
    .min(1)
    .max(10)
    .describe("How many suppliers to contact"),
});

export type EnquiryAnalyzerOutput = z.infer<typeof enquiryAnalyzerSchema>;
