import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailQueue } from "@/lib/queue";
import { renderEmail } from "@/lib/email/render";
import { generateMagicLink, formatExpirationTime } from "@/lib/magic-link";
import { MagicLinkPurpose } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Auth check - admin only
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    if (userRole !== "SUPERADMIN" && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id: organisationId } = await params;

    // Fetch the organisation and its primary user
    const organisation = await prisma.organisation.findUnique({
      where: { id: organisationId, type: "SUPPLIER", deletedAt: null },
      include: {
        users: {
          where: { role: "SUPPLIER", isActive: true, deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 1, // Get the primary user (first created)
        },
      },
    });

    if (!organisation) {
      return NextResponse.json(
        { error: "Supplier organisation not found" },
        { status: 404 }
      );
    }

    const supplierUser = organisation.users[0];

    if (!supplierUser) {
      return NextResponse.json(
        { error: "No user found for this organisation. Please add a user first." },
        { status: 400 }
      );
    }

    // Get client info for security tracking
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    // Generate magic link with 7-day expiration
    const magicLinkResult = await generateMagicLink({
      userId: supplierUser.id,
      purpose: MagicLinkPurpose.SUPPLIER_ONBOARDING,
      redirectTo: "/supplier-portal",
      ipAddress,
      userAgent,
    });

    if (!magicLinkResult.success) {
      if (magicLinkResult.code === "RATE_LIMITED") {
        return NextResponse.json(
          { error: magicLinkResult.error },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Failed to generate invite link" },
        { status: 500 }
      );
    }

    const expirationText = formatExpirationTime(MagicLinkPurpose.SUPPLIER_ONBOARDING);

    // Render supplier invite email
    const emailHtml = await renderEmail({
      type: "supplier-invite",
      props: {
        magicLinkUrl: magicLinkResult.url,
        organisationName: organisation.name,
        expirationTime: expirationText,
        contactName: `${supplierUser.firstName} ${supplierUser.lastName}`.trim() || undefined,
      },
    });

    // Queue email for sending
    await emailQueue.add("send-email", {
      to: supplierUser.email,
      subject: `Welcome to GroupBus - Activate Your ${organisation.name} Supplier Account`,
      html: emailHtml,
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: "SUPPLIER_INVITE_SENT",
        entityType: "Organisation",
        entityId: organisationId,
        actorId: session.user.id,
        changes: {
          invitedUserId: supplierUser.id,
          invitedEmail: supplierUser.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${supplierUser.email}`,
      expiresAt: magicLinkResult.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Supplier invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
