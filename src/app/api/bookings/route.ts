import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // Role-based filtering
    if (session.user.role === "CLIENT") {
      where.enquiry = { customerId: session.user.id };
    } else if (session.user.role === "SUPPLIER") {
      where.organisationId = session.user.organisationId;
    }
    // ADMIN/SUPERADMIN: no additional filtering

    // Search filter
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { enquiry: { contactName: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          enquiry: {
            select: {
              referenceNumber: true,
              contactName: true,
              contactEmail: true,
              pickupLocation: true,
              dropoffLocation: true,
              departureDate: true,
            },
          },
          organisation: {
            select: {
              name: true,
            },
          },
          customerQuote: {
            select: {
              totalPrice: true,
              referenceNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Bookings GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
