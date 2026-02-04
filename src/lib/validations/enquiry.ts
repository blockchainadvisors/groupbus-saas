import { z } from "zod";

// ──────────────────────────────────────────────
// Step 1 – Trip Details
// ──────────────────────────────────────────────

export const tripTypeEnum = z.enum(["ONE_WAY", "RETURN", "MULTI_STOP"]);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const step1Schema = z
  .object({
    pickupLocation: z.string().min(3, "Pickup location must be at least 3 characters"),
    pickupLat: z.number().optional(),
    pickupLng: z.number().optional(),
    dropoffLocation: z.string().optional(),
    dropoffLat: z.number().optional(),
    dropoffLng: z.number().optional(),
    tripType: tripTypeEnum,
    departureDate: z
      .string()
      .min(1, "Departure date is required")
      .refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime()) && date > new Date();
        },
        { message: "Departure date must be a valid date in the future" }
      ),
    departureTime: z
      .string()
      .regex(timeRegex, "Departure time must be in HH:MM format")
      .optional(),
    returnDate: z.string().optional(),
    returnTime: z
      .string()
      .regex(timeRegex, "Return time must be in HH:MM format")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.tripType === "RETURN") {
        return !!data.returnDate && data.returnDate.length > 0;
      }
      return true;
    },
    {
      message: "Return date is required for return trips",
      path: ["returnDate"],
    }
  );

export type Step1Data = z.infer<typeof step1Schema>;

// ──────────────────────────────────────────────
// Step 2 – Vehicle Preferences
// ──────────────────────────────────────────────

export const vehicleTypeEnum = z.enum([
  "MINIBUS",
  "STANDARD_COACH",
  "EXECUTIVE_COACH",
  "DOUBLE_DECKER",
  "MIDI_COACH",
  "OTHER",
]);

export const step2Schema = z.object({
  passengerCount: z
    .number()
    .min(1, "At least 1 passenger is required")
    .max(500, "Maximum 500 passengers"),
  vehicleType: vehicleTypeEnum.optional(),
  wheelchairAccessible: z.boolean().optional().default(false),
  luggageSpace: z.boolean().optional().default(false),
});

export type Step2Data = z.infer<typeof step2Schema>;

// ──────────────────────────────────────────────
// Step 3 – Additional Info
// ──────────────────────────────────────────────

export const step3Schema = z.object({
  specialRequirements: z.array(z.string()).optional(),
  budgetMin: z.number().min(0, "Budget minimum must be 0 or greater").optional(),
  budgetMax: z.number().min(0, "Budget maximum must be 0 or greater").optional(),
  additionalNotes: z
    .string()
    .max(2000, "Additional notes must be 2000 characters or fewer")
    .optional(),
});

export type Step3Data = z.infer<typeof step3Schema>;

// ──────────────────────────────────────────────
// Step 4 – Contact Details
// ──────────────────────────────────────────────

export const step4Schema = z.object({
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().min(10, "Phone number must be at least 10 characters"),
  companyName: z.string().optional(),
  gdprConsent: z.boolean().refine((val) => val === true, {
    message: "You must consent to our data processing policy",
  }),
});

export type Step4Data = z.infer<typeof step4Schema>;

// ──────────────────────────────────────────────
// Combined Enquiry Schema (all steps merged)
// ──────────────────────────────────────────────

export const enquirySchema = z
  .object({
    // Step 1 – Trip Details
    pickupLocation: z.string().min(3, "Pickup location must be at least 3 characters"),
    pickupLat: z.number().optional(),
    pickupLng: z.number().optional(),
    dropoffLocation: z.string().optional(),
    dropoffLat: z.number().optional(),
    dropoffLng: z.number().optional(),
    tripType: tripTypeEnum,
    departureDate: z
      .string()
      .min(1, "Departure date is required")
      .refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime()) && date > new Date();
        },
        { message: "Departure date must be a valid date in the future" }
      ),
    departureTime: z
      .string()
      .regex(timeRegex, "Departure time must be in HH:MM format")
      .optional(),
    returnDate: z.string().optional(),
    returnTime: z
      .string()
      .regex(timeRegex, "Return time must be in HH:MM format")
      .optional(),

    // Step 2 – Vehicle Preferences
    passengerCount: z
      .number()
      .min(1, "At least 1 passenger is required")
      .max(500, "Maximum 500 passengers"),
    vehicleType: vehicleTypeEnum.optional(),
    wheelchairAccessible: z.boolean().optional().default(false),
    luggageSpace: z.boolean().optional().default(false),

    // Step 3 – Additional Info
    specialRequirements: z.array(z.string()).optional(),
    budgetMin: z.number().min(0, "Budget minimum must be 0 or greater").optional(),
    budgetMax: z.number().min(0, "Budget maximum must be 0 or greater").optional(),
    additionalNotes: z
      .string()
      .max(2000, "Additional notes must be 2000 characters or fewer")
      .optional(),

    // Step 4 – Contact Details
    contactName: z.string().min(2, "Contact name must be at least 2 characters"),
    contactEmail: z.string().email("Please enter a valid email address"),
    contactPhone: z.string().min(10, "Phone number must be at least 10 characters"),
    companyName: z.string().optional(),
    gdprConsent: z.boolean().refine((val) => val === true, {
      message: "You must consent to our data processing policy",
    }),
  })
  .refine(
    (data) => {
      if (data.tripType === "RETURN") {
        return !!data.returnDate && data.returnDate.length > 0;
      }
      return true;
    },
    {
      message: "Return date is required for return trips",
      path: ["returnDate"],
    }
  );

export type EnquiryFormData = z.infer<typeof enquirySchema>;
