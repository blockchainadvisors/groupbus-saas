import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const customerQuote = await prisma.customerQuote.findUnique({
      where: { acceptanceToken: token },
    });

    if (!customerQuote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    if (customerQuote.status !== "SENT_TO_CUSTOMER") {
      return NextResponse.json(
        { error: "This quote can no longer be declined" },
        { status: 400 }
      );
    }

    let declineReason: string | undefined;
    try {
      const body = await request.json();
      declineReason = body.reason;
    } catch {
      // Body is optional, so we ignore parse errors
    }

    await prisma.customerQuote.update({
      where: { id: customerQuote.id },
      data: {
        status: "REJECTED",
        respondedAt: new Date(),
        declineReason: declineReason ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
