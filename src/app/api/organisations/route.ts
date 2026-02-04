import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSupplierSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required").max(50),
  address: z.string().max(500).optional().default(""),
  contactFirstName: z.string().min(1, "Contact first name is required").max(100),
  contactLastName: z.string().min(1, "Contact last name is required").max(100),
  contactEmail: z.string().email("Invalid contact email address"),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const validated = createSupplierSchema.parse(body);

    // Check if a user with the contact email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.contactEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "A user with this email address already exists",
          issues: [
            {
              path: ["contactEmail"],
              message: "A user with this email address already exists",
            },
          ],
        },
        { status: 409 }
      );
    }

    // Create Organisation and User in a transaction
    const organisation = await prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: validated.companyName,
          type: "SUPPLIER",
          email: validated.email,
          phone: validated.phone,
          address: validated.address || null,
          isActive: true,
          rating: 0,
          totalJobsCompleted: 0,
          reliabilityScore: 100,
        },
      });

      await tx.user.create({
        data: {
          email: validated.contactEmail,
          firstName: validated.contactFirstName,
          lastName: validated.contactLastName,
          passwordHash: "", // Password to be set via invitation/reset flow
          role: "SUPPLIER",
          isActive: true,
          organisationId: org.id,
        },
      });

      return org;
    });

    return NextResponse.json(
      { id: organisation.id, name: organisation.name },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Organisation creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
