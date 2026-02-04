import { z } from "zod";

export const supplierRankingSchema = z.object({
  supplierId: z.string(),
  rank: z.number(),
  compositeScore: z.number().min(0).max(100),
  reasoning: z.string(),
  scores: z.object({
    rating: z.number().min(0).max(100),
    priceCompetitiveness: z.number().min(0).max(100),
    reliability: z.number().min(0).max(100),
    proximity: z.number().min(0).max(100),
    responseTime: z.number().min(0).max(100),
    fleetMatch: z.number().min(0).max(100),
  }),
  riskFlags: z.array(z.string()),
});

export const supplierSelectorSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  rankedSuppliers: z.array(supplierRankingSchema),
  reasoning: z
    .string()
    .describe("Overall selection strategy explanation"),
  recommendedCount: z
    .number()
    .describe("How many suppliers to actually contact"),
});

export type SupplierSelectorOutput = z.infer<typeof supplierSelectorSchema>;
