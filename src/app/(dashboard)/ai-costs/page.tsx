import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import { DollarSign, Brain } from "lucide-react";
import type { AiTaskType } from "@prisma/client";

export const metadata: Metadata = {
  title: "AI Costs",
};

const TASK_TYPE_LABELS: Record<AiTaskType, string> = {
  EMAIL_PARSER: "Email Parser",
  ENQUIRY_ANALYZER: "Enquiry Analyzer",
  SUPPLIER_SELECTOR: "Supplier Selector",
  BID_EVALUATOR: "Bid Evaluator",
  MARKUP_CALCULATOR: "Markup Calculator",
  QUOTE_CONTENT: "Quote Content",
  JOB_DOCUMENTS: "Job Documents",
  EMAIL_PERSONALIZER: "Email Personalizer",
};

type Period = "today" | "week" | "month";

function getPeriodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "month": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return start;
    }
  }
}

function getPeriodLabel(period: Period): string {
  switch (period) {
    case "today":
      return "Today";
    case "week":
      return "This Week";
    case "month":
      return "This Month";
  }
}

export default async function AiCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const period: Period =
    params.period === "week" || params.period === "month"
      ? params.period
      : "today";

  const periodStart = getPeriodStart(period);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch overview stats and cost records in parallel
  const [
    costRecordsToday,
    costRecordsWeek,
    costRecordsMonth,
    decisionsToday,
    costRecordsForPeriod,
    recentDecisions,
  ] = await Promise.all([
    // Total cost today
    prisma.aiCostRecord.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { estimatedCostUsd: true },
    }),
    // Total cost this week
    prisma.aiCostRecord.findMany({
      where: { createdAt: { gte: weekStart } },
      select: { estimatedCostUsd: true },
    }),
    // Total cost this month
    prisma.aiCostRecord.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { estimatedCostUsd: true },
    }),
    // Total API calls today
    prisma.aiDecisionLog.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Cost records for selected period (for breakdown table)
    prisma.aiCostRecord.findMany({
      where: { createdAt: { gte: periodStart } },
      select: {
        taskType: true,
        estimatedCostUsd: true,
      },
    }),
    // Recent AI decisions (last 20)
    prisma.aiDecisionLog.findMany({
      select: {
        id: true,
        taskType: true,
        model: true,
        confidenceScore: true,
        autoExecuted: true,
        estimatedCostUsd: true,
        latencyMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Calculate totals
  const totalCostToday = costRecordsToday.reduce(
    (sum, r) => sum + r.estimatedCostUsd,
    0
  );
  const totalCostWeek = costRecordsWeek.reduce(
    (sum, r) => sum + r.estimatedCostUsd,
    0
  );
  const totalCostMonth = costRecordsMonth.reduce(
    (sum, r) => sum + r.estimatedCostUsd,
    0
  );

  // Build cost breakdown by task type for selected period
  const costByTaskTypeMap = new Map<
    AiTaskType,
    { totalCost: number; count: number }
  >();

  for (const record of costRecordsForPeriod) {
    const existing = costByTaskTypeMap.get(record.taskType) ?? {
      totalCost: 0,
      count: 0,
    };
    existing.totalCost += record.estimatedCostUsd;
    existing.count += 1;
    costByTaskTypeMap.set(record.taskType, existing);
  }

  const costByTaskType = Array.from(costByTaskTypeMap.entries())
    .map(([taskType, data]) => ({
      taskType,
      totalCost: data.totalCost,
      count: data.count,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Costs"
        description="Monitor AI API usage and estimated costs."
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cost Today
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCostToday.toFixed(4)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cost This Week
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCostWeek.toFixed(4)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cost This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalCostMonth.toFixed(4)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Calls Today
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decisionsToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Breakdown period:
        </span>
        <div className="flex gap-1">
          {(["today", "week", "month"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/ai-costs${p !== "today" ? `?period=${p}` : ""}`}>
                {getPeriodLabel(p)}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Cost Breakdown by Task Type */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Cost Breakdown by Task Type ({getPeriodLabel(period)})
        </h2>
        {costByTaskType.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No cost data"
            description={`No AI cost records found for ${getPeriodLabel(period).toLowerCase()}.`}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      Task Type
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Total Cost (USD)
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      API Calls
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Avg Cost / Call
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costByTaskType.map((row) => (
                    <tr
                      key={row.taskType}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {TASK_TYPE_LABELS[row.taskType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        ${row.totalCost.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.count}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        $
                        {row.count > 0
                          ? (row.totalCost / row.count).toFixed(4)
                          : "0.0000"}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted/50 font-medium">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      $
                      {costByTaskType
                        .reduce((sum, r) => sum + r.totalCost, 0)
                        .toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {costByTaskType.reduce((sum, r) => sum + r.count, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Recent AI Decisions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent AI Decisions</h2>
        {recentDecisions.length === 0 ? (
          <EmptyState
            icon={Brain}
            title="No AI decisions yet"
            description="AI pipeline decisions will appear here once they start being processed."
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Task Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Model</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Auto-Executed
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Cost (USD)
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentDecisions.map((decision) => (
                    <tr
                      key={decision.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(decision.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {TASK_TYPE_LABELS[decision.taskType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {decision.model}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            decision.confidenceScore >= 0.9
                              ? "text-emerald-600 dark:text-emerald-400"
                              : decision.confidenceScore >= 0.7
                                ? "text-blue-600 dark:text-blue-400"
                                : decision.confidenceScore >= 0.5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {(decision.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            decision.autoExecuted ? "success" : "warning"
                          }
                        >
                          {decision.autoExecuted ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        ${decision.estimatedCostUsd.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {decision.latencyMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
