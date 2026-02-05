import { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { formatCurrency } from "@/lib/utils";
import {
  MessageSquare,
  FileText,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { EnquiryTrendChart } from "@/components/features/dashboard/enquiry-trend-chart";
import { EnquiryStatusChart } from "@/components/features/dashboard/enquiry-status-chart";
import { PipelineFunnelChart } from "@/components/features/dashboard/pipeline-funnel-chart";
import { PaymentDonutChart } from "@/components/features/dashboard/payment-donut-chart";
import { PaymentSuccessGauge } from "@/components/features/dashboard/payment-success-gauge";
import { AiConfidenceGauge } from "@/components/features/dashboard/ai-confidence-gauge";
import { AiDistributionChart } from "@/components/features/dashboard/ai-distribution-chart";
import { RecentEnquiriesTable } from "@/components/features/dashboard/recent-enquiries-table";
import { AiActivityTable } from "@/components/features/dashboard/ai-activity-table";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireAuth();

  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [
    enquiries,
    activeQuotes,
    bookings,
    revenueResult,
    recentEnquiries,
    recentAiActivity,
    pendingReviews,
    // Pipeline funnel
    totalEnquiries,
    sentToSuppliers,
    quotesReceived,
    quoteSentToCustomer,
    acceptedQuotes,
    confirmedBookings,
    completedBookings,
    // Payment stats
    totalPayments,
    succeededPayments,
    pendingPayments,
    // New queries for charts
    enquiryTrendRaw,
    enquiryStatusGroups,
    aiActionGroups,
    aiConfidenceResult,
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

    // Pipeline funnel data (this month)
    prisma.enquiry.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.enquiry.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ["SENT_TO_SUPPLIERS", "QUOTES_RECEIVED", "QUOTE_SENT", "ACCEPTED"] },
      },
    }),
    prisma.enquiry.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ["QUOTES_RECEIVED", "QUOTE_SENT", "ACCEPTED"] },
      },
    }),
    prisma.enquiry.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: { in: ["QUOTE_SENT", "ACCEPTED"] },
      },
    }),
    prisma.enquiry.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: "ACCEPTED",
      },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: "CONFIRMED",
      },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: startOfMonth },
        status: "COMPLETED",
      },
    }),

    // Payment stats this month
    prisma.payment.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.payment.count({
      where: { createdAt: { gte: startOfMonth }, status: "SUCCEEDED" },
    }),
    prisma.payment.count({
      where: { createdAt: { gte: startOfMonth }, status: "PENDING" },
    }),

    // Daily enquiry trend (past 14 days) — fetch dates and group in JS
    prisma.enquiry.findMany({
      select: { createdAt: true },
      where: { createdAt: { gte: fourteenDaysAgo } },
    }),

    // Enquiry status distribution
    prisma.enquiry.groupBy({
      by: ["status"],
      _count: true,
    }),

    // AI action distribution
    prisma.aiDecisionLog.groupBy({
      by: ["actionTaken"],
      _count: true,
    }),

    // Average AI confidence
    prisma.aiDecisionLog.aggregate({
      _avg: { confidenceScore: true },
    }),
  ]);

  const revenue = revenueResult._sum.amount ?? 0;

  // Build 14-day trend data
  const trendMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo);
    d.setDate(d.getDate() + i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of enquiryTrendRaw) {
    const key = row.createdAt.toISOString().slice(0, 10);
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }
  const enquiryTrendData = Array.from(trendMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Enquiry status distribution
  const enquiryStatusData = enquiryStatusGroups.map((g) => ({
    status: g.status,
    count: g._count,
  }));

  // AI action distribution
  const aiDistributionData = aiActionGroups.map((g) => ({
    actionTaken: g.actionTaken,
    count: g._count,
  }));

  // Average AI confidence (0-100)
  const avgAiConfidence = Math.round(
    (aiConfidenceResult._avg.confidenceScore ?? 0) * 100
  );

  // Payment derived
  const failedPayments = totalPayments - succeededPayments - pendingPayments;
  const paymentSuccessRate =
    totalPayments > 0 ? Math.round((succeededPayments / totalPayments) * 100) : 0;

  // Serialise dates for client components
  const serialisedEnquiries = recentEnquiries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }));
  const serialisedAiActivity = recentAiActivity.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const isAdmin = user.role === "SUPERADMIN" || user.role === "ADMIN";

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description="Here's an overview of your operations."
      />

      {pendingReviews > 0 && (
        <Link href="/human-review">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">
                {pendingReviews} pending human review{" "}
                {pendingReviews === 1 ? "task" : "tasks"}
              </p>
              <p className="text-sm opacity-80">
                AI decisions require your review before proceeding. Click to
                review.
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="New Enquiries"
          value={enquiries}
          description="this month"
          icon={MessageSquare}
          iconColor="blue"
        />
        <StatCard
          title="Active Quotes"
          value={activeQuotes}
          description="awaiting response"
          icon={FileText}
          iconColor="amber"
        />
        <StatCard
          title="Bookings"
          value={bookings}
          description="this month"
          icon={CalendarCheck}
          iconColor="green"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(revenue)}
          description="this month"
          icon={TrendingUp}
          iconColor="purple"
        />
      </div>

      {isAdmin && (
        <>
          {/* Row 2: Enquiry Trend + Gauges */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EnquiryTrendChart data={enquiryTrendData} />
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-1">
              <PaymentSuccessGauge rate={paymentSuccessRate} />
              <AiConfidenceGauge avgConfidence={avgAiConfidence} />
            </div>
          </div>

          {/* Row 3: Pipeline Funnel + Enquiry Status */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PipelineFunnelChart
                data={{
                  totalEnquiries,
                  sentToSuppliers,
                  quotesReceived,
                  quoteSentToCustomer,
                  acceptedQuotes,
                  confirmedBookings,
                  completedBookings,
                }}
              />
            </div>
            <div className="lg:col-span-2">
              <EnquiryStatusChart data={enquiryStatusData} />
            </div>
          </div>

          {/* Row 4: Payments + AI Distribution */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PaymentDonutChart
              succeeded={succeededPayments}
              pending={pendingPayments}
              failed={failedPayments}
            />
            <AiDistributionChart data={aiDistributionData} />
          </div>

          {/* Row 5: Recent Enquiries + AI Activity Tables */}
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentEnquiriesTable data={serialisedEnquiries} />
            <AiActivityTable data={serialisedAiActivity} />
          </div>
        </>
      )}

      {/* Non-admin: simpler view with tables only */}
      {!isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <RecentEnquiriesTable data={serialisedEnquiries} />
        </div>
      )}
    </div>
  );
}
