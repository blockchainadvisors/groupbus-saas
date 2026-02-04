import { z } from "zod";

export const jobDocumentsSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  jobSheet: z.object({
    title: z.string(),
    bookingReference: z.string(),
    customerName: z.string(),
    pickupDetails: z.string(),
    dropoffDetails: z.string(),
    schedule: z.string(),
    specialInstructions: z.string(),
    emergencyContact: z.string(),
  }),
  driverBriefing: z.object({
    summary: z.string(),
    routeNotes: z.string(),
    parkingInstructions: z.string(),
    passengerNotes: z.string(),
    timings: z.string(),
  }),
  supplierNotes: z
    .string()
    .describe("Any notes for the supplier"),
});

export type JobDocumentsOutput = z.infer<typeof jobDocumentsSchema>;
