import { z } from "zod";

export const quoteContentSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  quoteDescription: z
    .string()
    .describe(
      "Professional, branded description of the service for the quote"
    ),
  emailSubject: z
    .string()
    .describe("Email subject line for the quote"),
  emailBody: z
    .string()
    .describe(
      "Full HTML email body for sending the quote to the customer"
    ),
  highlights: z
    .array(z.string())
    .describe("Key selling points to display on the quote"),
});

export type QuoteContentOutput = z.infer<typeof quoteContentSchema>;
