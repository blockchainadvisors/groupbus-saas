import { NextResponse } from "next/server";
import { z } from "zod";
import { MagicLinkPurpose } from "@prisma/client";
import { generateMagicLinkByEmail, formatExpirationTime } from "@/lib/magic-link";
import { emailQueue } from "@/lib/queue";
import { renderEmail } from "@/lib/email/render";
import { headers } from "next/headers";

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.nativeEnum(MagicLinkPurpose).optional().default(MagicLinkPurpose.LOGIN),
  redirectTo: z.string().optional(),
});

// Always return the same response to prevent email enumeration
const SUCCESS_RESPONSE = {
  success: true,
  message: "If an account exists with this email, you will receive a magic link shortly.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);

    // Get client info for security tracking
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Generate magic link
    const result = await generateMagicLinkByEmail(validated.email.toLowerCase().trim(), {
      purpose: validated.purpose,
      redirectTo: validated.redirectTo,
      ipAddress,
      userAgent,
    });

    // If magic link was generated successfully, send email
    if (result.success) {
      const expirationText = formatExpirationTime(validated.purpose);

      // Render email template
      const emailHtml = await renderEmail({
        type: "magic-link",
        props: {
          magicLinkUrl: result.url,
          expirationTime: expirationText,
          purpose: validated.purpose,
          ipAddress: ipAddress !== "unknown" ? ipAddress : undefined,
          userAgent: userAgent !== "unknown" ? userAgent.substring(0, 100) : undefined,
        },
      });

      // Queue email for sending
      await emailQueue.add("send-email", {
        to: validated.email.toLowerCase().trim(),
        subject: getMagicLinkSubject(validated.purpose),
        html: emailHtml,
      });
    } else if (result.code === "RATE_LIMITED") {
      // For rate limiting, we can return an error since it doesn't reveal email existence
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 429 }
      );
    }
    // For all other cases (including EMAIL_NOT_FOUND), return success to prevent enumeration

    return NextResponse.json(SUCCESS_RESPONSE);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Magic link request error:", error);
    // Return generic success to prevent information leakage
    return NextResponse.json(SUCCESS_RESPONSE);
  }
}

function getMagicLinkSubject(purpose: MagicLinkPurpose): string {
  switch (purpose) {
    case MagicLinkPurpose.LOGIN:
      return "Sign in to GroupBus";
    case MagicLinkPurpose.ENQUIRY_ACCESS:
      return "Access Your GroupBus Dashboard";
    case MagicLinkPurpose.SUPPLIER_ONBOARDING:
      return "Welcome to GroupBus - Activate Your Supplier Account";
    default:
      return "Sign in to GroupBus";
  }
}
