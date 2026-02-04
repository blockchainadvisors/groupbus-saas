import { z } from "zod";

export const bidEvaluationSchema = z.object({
  bidId: z.string(),
  supplierId: z.string(),
  rank: z.number(),
  fairnessScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How fair/reasonable the price is"),
  overallScore: z.number().min(0).max(100),
  reasoning: z.string(),
  anomalyFlag: z.boolean(),
  anomalyReason: z.string().optional(),
  scores: z.object({
    priceFairness: z.number().min(0).max(100),
    supplierReliability: z.number().min(0).max(100),
    vehicleQuality: z.number().min(0).max(100),
    valueForMoney: z.number().min(0).max(100),
  }),
});

export const bidEvaluatorSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  evaluatedBids: z.array(bidEvaluationSchema),
  recommendedWinnerId: z
    .string()
    .describe("ID of the recommended winning bid"),
  reasoning: z.string(),
  hasAnomalies: z.boolean(),
  anomalySummary: z.string().optional(),
});

export type BidEvaluatorOutput = z.infer<typeof bidEvaluatorSchema>;
