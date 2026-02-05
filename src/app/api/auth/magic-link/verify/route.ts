import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { verifyMagicLink } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const AUTH_SECRET = process.env.AUTH_SECRET!;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const redirectTo = url.searchParams.get("redirectTo") || "/dashboard";

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing_token", APP_URL)
    );
  }

  // Verify the magic link token
  const result = await verifyMagicLink(token);

  if (!result.success) {
    const errorParam = encodeURIComponent(result.code.toLowerCase());
    return NextResponse.redirect(
      new URL(`/login?error=${errorParam}`, APP_URL)
    );
  }

  // Mark email as verified if not already
  await prisma.user.update({
    where: { id: result.user.id },
    data: { emailVerified: new Date() },
  });

  // Create a log entry for audit purposes
  await prisma.auditLog.create({
    data: {
      action: "MAGIC_LINK_LOGIN",
      entityType: "User",
      entityId: result.user.id,
      actorId: result.user.id,
      changes: { purpose: result.purpose },
    },
  });

  // Create NextAuth JWT token with proper salt for Auth.js v5
  const jwtToken = await encode({
    token: {
      id: result.user.id,
      email: result.user.email,
      name: `${result.user.firstName} ${result.user.lastName}`,
      role: result.user.role,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      organisationId: result.user.organisationId,
      image: result.user.image,
    },
    secret: AUTH_SECRET,
    salt: "authjs.session-token", // Required for Auth.js v5
    maxAge: 24 * 60 * 60, // 24 hours
  });

  // Build the redirect URL
  const sanitizedRedirect = sanitizeRedirectUrl(redirectTo);
  const response = NextResponse.redirect(new URL(sanitizedRedirect, APP_URL));

  const isSecure = APP_URL.startsWith("https");

  // Set the session cookie (NextAuth v5 uses this cookie name by default)
  response.cookies.set("authjs.session-token", jwtToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  });

  // Also set the callback URL cookie for CSRF protection
  response.cookies.set("authjs.callback-url", sanitizedRedirect, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

/**
 * Sanitize redirect URL to prevent open redirect vulnerabilities
 */
function sanitizeRedirectUrl(url: string): string {
  // Only allow relative paths
  if (!url.startsWith("/")) {
    return "/dashboard";
  }

  // Remove any protocol or domain that might have been injected
  const sanitized = url.replace(/^\/+/, "/");

  // Whitelist allowed paths
  const allowedPaths = [
    "/dashboard",
    "/enquiries",
    "/quotes",
    "/bookings",
    "/suppliers",
    "/settings",
    "/supplier-portal",
  ];

  // Check if the path starts with any allowed path
  const isAllowed = allowedPaths.some((path) => sanitized.startsWith(path));

  return isAllowed ? sanitized : "/dashboard";
}
