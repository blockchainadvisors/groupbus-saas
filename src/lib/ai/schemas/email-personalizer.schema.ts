import { z } from "zod";

export const emailPersonalizerSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  subject: z.string(),
  body: z.string().describe("Personalized HTML email body"),
  tone: z.enum(["formal", "friendly", "urgent"]),
});

export type EmailPersonalizerOutput = z.infer<typeof emailPersonalizerSchema>;
