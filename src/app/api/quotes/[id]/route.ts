import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const quote = await prisma.customerQuote.findUnique({
      where: { id },
      include: {
        enquiry: true,
        supplierQuote: {
          include: {
            organisation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        booking: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Role check: CLIENT can only access their own enquiries' quotes
    if (
      session.user.role === "CLIENT" &&
      quote.enquiry.customerId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quote GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Fetch existing quote
    const existingQuote = await prisma.customerQuote.findUnique({
      where: { id },
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle markup percentage change with recalculation
    if (
      body.markupPercentage !== undefined &&
      body.markupPercentage !== existingQuote.markupPercentage
    ) {
      const markupPercentage = Number(body.markupPercentage);
      if (isNaN(markupPercentage) || markupPercentage < 0) {
        return NextResponse.json(
          { error: "Invalid markup percentage" },
          { status: 400 }
        );
      }

      const supplierPrice = existingQuote.supplierPrice;
      const markupAmount = supplierPrice * (markupPercentage / 100);
      const subtotal = supplierPrice + markupAmount;
      const vatRate = existingQuote.vatRate;
      const vatAmount = subtotal * (vatRate / 100);
      const totalPrice = subtotal + vatAmount;

      updateData.markupPercentage = markupPercentage;
      updateData.markupAmount = Math.round(markupAmount * 100) / 100;
      updateData.subtotal = Math.round(subtotal * 100) / 100;
      updateData.vatAmount = Math.round(vatAmount * 100) / 100;
      updateData.totalPrice = Math.round(totalPrice * 100) / 100;
    }

    // Handle status update
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Handle validUntil update
    if (body.validUntil !== undefined) {
      updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedQuote = await prisma.customerQuote.update({
      where: { id },
      data: updateData,
      include: {
        enquiry: true,
        supplierQuote: {
          include: {
            organisation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        booking: true,
        payments: true,
      },
    });

    return NextResponse.json(updatedQuote);
  } catch (error) {
    console.error("Quote PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
