import { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  MessageSquare,
  FileText,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  ]);

  const revenue = revenueResult._sum.amount ?? 0;

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New Enquiries"
          value={enquiries}
          description="this month"
          icon={MessageSquare}
        />
        <StatCard
          title="Active Quotes"
          value={activeQuotes}
          description="awaiting response"
          icon={FileText}
        />
        <StatCard
          title="Bookings"
          value={bookings}
          description="this month"
          icon={CalendarCheck}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(revenue)}
          description="this month"
          icon={TrendingUp}
        />
      </div>

      {/* Pipeline Funnel */}
      {(user.role === "SUPERADMIN" || user.role === "ADMIN") && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[
                { label: "Enquiries", value: totalEnquiries, color: "bg-blue-500" },
                { label: "Sent to Suppliers", value: sentToSuppliers, color: "bg-indigo-500" },
                { label: "Quotes Received", value: quotesReceived, color: "bg-violet-500" },
                { label: "Sent to Customer", value: quoteSentToCustomer, color: "bg-purple-500" },
                { label: "Accepted", value: acceptedQuotes, color: "bg-emerald-500" },
                { label: "Confirmed", value: confirmedBookings, color: "bg-green-500" },
                { label: "Completed", value: completedBookings, color: "bg-teal-500" },
              ].map((stage, i, arr) => (
                <div key={stage.label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div
                      className={`${stage.color} text-white rounded-lg px-3 py-2 text-center w-full`}
                    >
                      <p className="text-lg font-bold">{stage.value}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-center whitespace-nowrap">
                      {stage.label}
                    </p>
                    {totalEnquiries > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round((stage.value / totalEnquiries) * 100)}%
                      </p>
                    )}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Stats */}
      {(user.role === "SUPERADMIN" || user.role === "ADMIN") && totalPayments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{totalPayments}</p>
                <p className="text-sm text-muted-foreground">Total Payments</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="success">{succeededPayments}</Badge>
                  <span className="text-sm text-muted-foreground">Succeeded</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{pendingPayments}</Badge>
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    {totalPayments - succeededPayments - pendingPayments}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
              </div>
              {totalPayments > 0 && (
                <div className="ml-auto text-right">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {Math.round((succeededPayments / totalPayments) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Enquiries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEnquiries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No enquiries yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Ref #</th>
                      <th className="pb-2 pr-4 font-medium">Customer</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEnquiries.map((enquiry) => (
                      <tr
                        key={enquiry.referenceNumber}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-4 font-mono text-xs">
                          {enquiry.referenceNumber}
                        </td>
                        <td className="py-2 pr-4">{enquiry.contactName}</td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={enquiry.status} />
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {formatDate(enquiry.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Activity */}
        <Card>
          <CardHeader>
            <CardTitle>AI Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAiActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI activity yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentAiActivity.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={log.taskType} />
                        <StatusBadge status={log.actionTaken} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {Math.round(log.confidenceScore * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        confidence
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
