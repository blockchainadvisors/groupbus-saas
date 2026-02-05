import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeAllUserTokens } from "@/lib/magic-link";

const setPasswordSchema = z
  .object({
    currentPassword: z.string().optional(), // Required if user already has a password
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    // Auth check - user must be logged in
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = setPasswordSchema.parse(body);

    // Fetch the user to check if they have an existing password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null, isActive: true },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hasExistingPassword = user.passwordHash && user.passwordHash.length > 0;

    // If user has existing password, verify current password
    if (hasExistingPassword) {
      if (!validated.currentPassword) {
        return NextResponse.json(
          {
            error: "Current password is required",
            issues: [
              { path: ["currentPassword"], message: "Current password is required" },
            ],
          },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        validated.currentPassword,
        user.passwordHash!
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            issues: [
              { path: ["currentPassword"], message: "Current password is incorrect" },
            ],
          },
          { status: 400 }
        );
      }
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(validated.newPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: newPasswordHash,
        emailVerified: new Date(), // Consider email verified once password is set
      },
    });

    // Revoke all magic link tokens for security (force re-authentication via new password)
    await revokeAllUserTokens(session.user.id);

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: hasExistingPassword ? "PASSWORD_CHANGED" : "PASSWORD_SET",
        entityType: "User",
        entityId: session.user.id,
        actorId: session.user.id,
        changes: {
          hadExistingPassword: hasExistingPassword,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: hasExistingPassword
        ? "Password changed successfully"
        : "Password set successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
