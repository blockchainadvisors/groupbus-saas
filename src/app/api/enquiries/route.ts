import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiPipelineQueue, emailQueue } from "@/lib/queue";
import { enquirySchema } from "@/lib/validations/enquiry";
import { renderEmail } from "@/lib/email/render";
import { generateMagicLink } from "@/lib/magic-link";
import { MagicLinkPurpose } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = enquirySchema.parse(body);

    // Get optional user session (guests can submit enquiries)
    const session = await auth();

    let customerId: string;

    if (session?.user?.id) {
      // Logged-in user — use their ID
      customerId = session.user.id;
    } else {
      // Guest — look up or create a CLIENT user by email
      const existingUser = await prisma.user.findUnique({
        where: { email: validated.contactEmail },
      });

      if (existingUser) {
        customerId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: validated.contactEmail,
            firstName: validated.contactName.split(" ")[0] || validated.contactName,
            lastName: validated.contactName.split(" ").slice(1).join(" ") || "",
            passwordHash: "", // Guest user — no password set
            phone: validated.contactPhone,
            role: "CLIENT",
          },
        });
        customerId = newUser.id;
      }
    }

    // Generate a unique reference number using the Sequence model
    const seq = await prisma.sequence.upsert({
      where: { prefix_year: { prefix: "GB-ENQ", year: new Date().getFullYear() } },
      update: { currentValue: { increment: 1 } },
      create: { prefix: "GB-ENQ", year: new Date().getFullYear(), currentValue: 1 },
    });
    const referenceNumber = `GB-ENQ-${new Date().getFullYear()}-${String(seq.currentValue).padStart(5, "0")}`;

    // Create the Enquiry record
    const enquiry = await prisma.enquiry.create({
      data: {
        referenceNumber,
        source: "WEBSITE",
        status: "SUBMITTED",
        customerId,
        pickupLocation: validated.pickupLocation,
        pickupLat: validated.pickupLat,
        pickupLng: validated.pickupLng,
        dropoffLocation: validated.dropoffLocation,
        dropoffLat: validated.dropoffLat,
        dropoffLng: validated.dropoffLng,
        tripType: validated.tripType,
        departureDate: new Date(validated.departureDate),
        departureTime: validated.departureTime,
        returnDate: validated.returnDate ? new Date(validated.returnDate) : undefined,
        returnTime: validated.returnTime,
        passengerCount: validated.passengerCount,
        vehicleType: validated.vehicleType,
        specialRequirements: validated.specialRequirements,
        budgetMin: validated.budgetMin,
        budgetMax: validated.budgetMax,
        additionalNotes: validated.additionalNotes,
        contactName: validated.contactName,
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        companyName: validated.companyName,
        gdprConsent: validated.gdprConsent,
      },
    });

    // Create initial status history record
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        toStatus: "SUBMITTED",
        notes: "Enquiry submitted via website",
      },
    });

    // Generate magic link for dashboard access (for guest users)
    let dashboardUrl: string | undefined;
    if (!session?.user?.id) {
      // Get client info for security tracking
      const headersList = await headers();
      const ipAddress =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        undefined;
      const userAgent = headersList.get("user-agent") || undefined;

      const magicLinkResult = await generateMagicLink({
        userId: customerId,
        purpose: MagicLinkPurpose.ENQUIRY_ACCESS,
        redirectTo: `/enquiries/${enquiry.id}`,
        ipAddress,
        userAgent,
      });

      if (magicLinkResult.success) {
        dashboardUrl = magicLinkResult.url;
      }
    }

    // Send confirmation email to customer using React Email template
    const tripTypeFormatted = validated.tripType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const specialRequirementsText =
      validated.specialRequirements && validated.specialRequirements.length > 0
        ? validated.specialRequirements.join(", ")
        : undefined;

    const emailHtml = await renderEmail({
      type: "enquiry-confirmation",
      props: {
        customerName: validated.contactName,
        enquiryReference: referenceNumber,
        tripDetails: {
          pickupLocation: validated.pickupLocation,
          dropoffLocation: validated.dropoffLocation ?? "To be confirmed",
          departureDate: new Date(validated.departureDate).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          departureTime: validated.departureTime ?? undefined,
          returnDate: validated.returnDate
            ? new Date(validated.returnDate).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : undefined,
          returnTime: validated.returnTime ?? undefined,
          passengerCount: validated.passengerCount,
          tripType: tripTypeFormatted,
          specialRequirements: specialRequirementsText,
        },
        dashboardUrl,
      },
    });

    await emailQueue.add("send-email", {
      to: validated.contactEmail,
      subject: `Enquiry ${referenceNumber} – We've Received Your Request`,
      html: emailHtml,
    });

    // Queue the AI pipeline job for enquiry intake processing
    await aiPipelineQueue.add("flow2:enquiry-intake", { enquiryId: enquiry.id });

    return NextResponse.json(
      { referenceNumber, enquiryId: enquiry.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Enquiry submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
