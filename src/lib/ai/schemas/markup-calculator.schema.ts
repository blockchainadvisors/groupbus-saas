import { z } from "zod";

export const markupCalculatorSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  recommendedMarkupPercent: z.number().min(0).max(100),
  markupAmount: z.number().describe("Markup amount in GBP"),
  totalPrice: z.number().describe("Final customer price in GBP"),
  reasoning: z.string(),
  acceptanceProbability: z
    .number()
    .min(0)
    .max(1)
    .describe("Estimated probability customer will accept at this price"),
  factors: z.object({
    tripComplexity: z.string(),
    marketCondition: z.string(),
    customerType: z.string(),
    competitivePosition: z.string(),
  }),
});

export type MarkupCalculatorOutput = z.infer<typeof markupCalculatorSchema>;
