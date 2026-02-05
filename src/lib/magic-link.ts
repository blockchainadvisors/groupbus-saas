import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { MagicLinkPurpose } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Expiration times in minutes
const EXPIRATION_TIMES: Record<MagicLinkPurpose, number> = {
  LOGIN: 15,
  ENQUIRY_ACCESS: 24 * 60, // 24 hours
  SUPPLIER_ONBOARDING: 7 * 24 * 60, // 7 days
};

// Rate limit: max requests per email per 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;

interface GenerateMagicLinkOptions {
  userId: string;
  purpose?: MagicLinkPurpose;
  redirectTo?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface GenerateMagicLinkResult {
  success: true;
  url: string;
  token: string;
  expiresAt: Date;
}

interface GenerateMagicLinkError {
  success: false;
  error: string;
  code: "RATE_LIMITED" | "USER_NOT_FOUND" | "INTERNAL_ERROR";
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a secure magic link token and store it in the database
 */
export async function generateMagicLink(
  options: GenerateMagicLinkOptions
): Promise<GenerateMagicLinkResult | GenerateMagicLinkError> {
  const {
    userId,
    purpose = MagicLinkPurpose.LOGIN,
    redirectTo,
    ipAddress,
    userAgent,
  } = options;

  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null, isActive: true },
      select: { id: true, email: true },
    });

    if (!user) {
      return { success: false, error: "User not found", code: "USER_NOT_FOUND" };
    }

    // Check rate limit
    const rateLimitWindow = new Date();
    rateLimitWindow.setMinutes(rateLimitWindow.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

    const recentTokenCount = await prisma.magicLinkToken.count({
      where: {
        userId,
        createdAt: { gte: rateLimitWindow },
      },
    });

    if (recentTokenCount >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        success: false,
        error: "Too many magic link requests. Please wait before trying again.",
        code: "RATE_LIMITED",
      };
    }

    // Generate 32-byte (256-bit) cryptographically secure random token
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + EXPIRATION_TIMES[purpose]);

    // Store token hash in database
    await prisma.magicLinkToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        purpose,
        ipAddress,
        userAgent,
      },
    });

    // Build magic link URL
    const url = new URL("/api/auth/magic-link/verify", APP_URL);
    url.searchParams.set("token", token);
    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }

    return {
      success: true,
      url: url.toString(),
      token,
      expiresAt,
    };
  } catch (error) {
    console.error("Error generating magic link:", error);
    return {
      success: false,
      error: "Failed to generate magic link",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Generate a magic link for a user by email
 */
export async function generateMagicLinkByEmail(
  email: string,
  options?: Omit<GenerateMagicLinkOptions, "userId">
): Promise<GenerateMagicLinkResult | GenerateMagicLinkError | { success: false; error: string; code: "EMAIL_NOT_FOUND" }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim(), deletedAt: null, isActive: true },
    select: { id: true },
  });

  if (!user) {
    // Return generic error to prevent email enumeration
    // The actual response to the user should always be the same
    return { success: false, error: "User not found", code: "EMAIL_NOT_FOUND" };
  }

  return generateMagicLink({ userId: user.id, ...options });
}

interface VerifyMagicLinkSuccess {
  success: true;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organisationId: string | null;
    image: string | null;
  };
  purpose: MagicLinkPurpose;
}

interface VerifyMagicLinkError {
  success: false;
  error: string;
  code: "INVALID_TOKEN" | "EXPIRED" | "ALREADY_USED" | "USER_INACTIVE";
}

/**
 * Verify a magic link token and mark it as used
 */
export async function verifyMagicLink(
  token: string
): Promise<VerifyMagicLinkSuccess | VerifyMagicLinkError> {
  const tokenHash = hashToken(token);

  // Find the token
  const magicLinkToken = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organisationId: true,
          image: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!magicLinkToken) {
    return {
      success: false,
      error: "Invalid or expired magic link",
      code: "INVALID_TOKEN",
    };
  }

  // Check if already used
  if (magicLinkToken.usedAt) {
    return {
      success: false,
      error: "This magic link has already been used",
      code: "ALREADY_USED",
    };
  }

  // Check if expired
  if (magicLinkToken.expiresAt < new Date()) {
    return {
      success: false,
      error: "This magic link has expired",
      code: "EXPIRED",
    };
  }

  // Check if user is still active
  if (!magicLinkToken.user.isActive || magicLinkToken.user.deletedAt) {
    return {
      success: false,
      error: "User account is inactive",
      code: "USER_INACTIVE",
    };
  }

  // Mark token as used immediately (single-use enforcement)
  await prisma.magicLinkToken.update({
    where: { id: magicLinkToken.id },
    data: { usedAt: new Date() },
  });

  // Update user's emailVerified timestamp if not already set
  if (!magicLinkToken.user.email) {
    await prisma.user.update({
      where: { id: magicLinkToken.user.id },
      data: { emailVerified: new Date() },
    });
  }

  return {
    success: true,
    user: {
      id: magicLinkToken.user.id,
      email: magicLinkToken.user.email,
      firstName: magicLinkToken.user.firstName,
      lastName: magicLinkToken.user.lastName,
      role: magicLinkToken.user.role,
      organisationId: magicLinkToken.user.organisationId,
      image: magicLinkToken.user.image,
    },
    purpose: magicLinkToken.purpose,
  };
}

/**
 * Clean up expired magic link tokens
 * This should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
  const result = await prisma.magicLinkToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        // Also delete used tokens older than 24 hours
        {
          AND: [
            { usedAt: { not: null } },
            { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          ],
        },
      ],
    },
  });

  return { deletedCount: result.count };
}

/**
 * Revoke all magic link tokens for a user
 * Useful when user changes password or requests security reset
 */
export async function revokeAllUserTokens(userId: string): Promise<{ revokedCount: number }> {
  const result = await prisma.magicLinkToken.deleteMany({
    where: { userId },
  });

  return { revokedCount: result.count };
}

/**
 * Get the expiration time in minutes for a given purpose
 */
export function getExpirationMinutes(purpose: MagicLinkPurpose): number {
  return EXPIRATION_TIMES[purpose];
}

/**
 * Format expiration time for display in emails
 */
export function formatExpirationTime(purpose: MagicLinkPurpose): string {
  const minutes = EXPIRATION_TIMES[purpose];

  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const days = hours / 24;
  return days === 1 ? "1 day" : `${days} days`;
}
