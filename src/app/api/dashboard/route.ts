import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const [
      enquiries,
      activeQuotes,
      bookings,
      revenueResult,
      recentEnquiries,
      recentAiActivity,
      pendingReviews,
    ] = await Promise.all([
      // Count enquiries created this month (excluding CANCELLED and EXPIRED)
      prisma.enquiry.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { notIn: ["CANCELLED", "EXPIRED"] },
        },
      }),

      // Count active quotes (sent to customer, awaiting response)
      prisma.customerQuote.count({
        where: {
          status: "SENT_TO_CUSTOMER",
        },
      }),

      // Count bookings this month (excluding CANCELLED)
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { not: "CANCELLED" },
        },
      }),

      // Sum revenue this month (successful payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: startOfMonth },
          status: "SUCCEEDED",
        },
      }),

      // Recent 5 enquiries
      prisma.enquiry.findMany({
        select: {
          referenceNumber: true,
          status: true,
          contactName: true,
          createdAt: true,
          tripType: true,
          pickupLocation: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Recent 5 AI decision logs
      prisma.aiDecisionLog.findMany({
        select: {
          taskType: true,
          actionTaken: true,
          confidenceScore: true,
          createdAt: true,
          autoExecuted: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Count pending human review tasks
      prisma.humanReviewTask.count({
        where: {
          status: "PENDING",
        },
      }),
    ]);

    const revenue = revenueResult._sum.amount ?? 0;

    return NextResponse.json({
      stats: {
        enquiries,
        activeQuotes,
        bookings,
        revenue,
      },
      recentEnquiries,
      recentAiActivity,
      pendingReviews,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
