import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { AiTaskType, AiActionTaken } from "@prisma/client";

export const metadata: Metadata = {
  title: "AI Decisions",
};

const PER_PAGE = 20;

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

const TASK_TYPE_VALUES: AiTaskType[] = [
  "EMAIL_PARSER",
  "ENQUIRY_ANALYZER",
  "SUPPLIER_SELECTOR",
  "BID_EVALUATOR",
  "MARKUP_CALCULATOR",
  "QUOTE_CONTENT",
  "JOB_DOCUMENTS",
  "EMAIL_PERSONALIZER",
];

function getConfidenceColor(score: number): string {
  if (score >= 0.9) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.7) return "text-blue-600 dark:text-blue-400";
  if (score >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getConfidenceBg(score: number): string {
  if (score >= 0.9) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (score >= 0.7) return "bg-blue-100 dark:bg-blue-900/30";
  if (score >= 0.5) return "bg-amber-100 dark:bg-amber-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getActionBadgeVariant(action: AiActionTaken) {
  switch (action) {
    case "AUTO_EXECUTED":
      return "success" as const;
    case "ESCALATED_TO_HUMAN":
      return "warning" as const;
    case "OVERRIDDEN":
      return "info" as const;
    default:
      return "secondary" as const;
  }
}

const ACTION_LABELS: Record<AiActionTaken, string> = {
  AUTO_EXECUTED: "Auto Executed",
  ESCALATED_TO_HUMAN: "Escalated",
  OVERRIDDEN: "Overridden",
};

export default async function AiDecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; taskType?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const taskTypeFilter = params.taskType as AiTaskType | undefined;

  const where = taskTypeFilter ? { taskType: taskTypeFilter } : {};

  // Fetch decisions and count in parallel
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [decisions, totalCount, todayDecisions] = await Promise.all([
    prisma.aiDecisionLog.findMany({
      where,
      select: {
        id: true,
        taskType: true,
        model: true,
        confidenceScore: true,
        autoExecuted: true,
        actionTaken: true,
        estimatedCostUsd: true,
        latencyMs: true,
        createdAt: true,
        enquiryId: true,
        enquiry: {
          select: {
            referenceNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.aiDecisionLog.count({ where }),
    prisma.aiDecisionLog.findMany({
      where: {
        createdAt: { gte: todayStart },
        ...where,
      },
      select: {
        confidenceScore: true,
        autoExecuted: true,
        estimatedCostUsd: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  // Compute summary stats
  const totalToday = todayDecisions.length;
  const autoExecutedToday = todayDecisions.filter((d) => d.autoExecuted).length;
  const autoExecutedPct =
    totalToday > 0 ? ((autoExecutedToday / totalToday) * 100).toFixed(1) : "0";
  const avgConfidence =
    totalToday > 0
      ? (
          todayDecisions.reduce((sum, d) => sum + d.confidenceScore, 0) /
          totalToday
        ).toFixed(2)
      : "0.00";
  const totalCostToday = todayDecisions
    .reduce((sum, d) => sum + d.estimatedCostUsd, 0)
    .toFixed(4);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (overrides.page && overrides.page !== "1") p.set("page", overrides.page);
    if (overrides.taskType ?? taskTypeFilter)
      p.set("taskType", (overrides.taskType ?? taskTypeFilter)!);
    const qs = p.toString();
    return `/ai-decisions${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Decisions"
        description="Review and manage AI-automated decisions."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Decisions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Auto-Executed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoExecutedPct}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cost Today (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCostToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Filter by task:
        </span>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={!taskTypeFilter ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/ai-decisions">All</Link>
          </Button>
          {TASK_TYPE_VALUES.map((tt) => (
            <Button
              key={tt}
              variant={taskTypeFilter === tt ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={buildUrl({ taskType: tt, page: "1" })}>
                {TASK_TYPE_LABELS[tt]}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {decisions.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No AI decisions yet"
          description="AI pipeline decisions will appear here for review and override."
        />
      ) : (
        <div className="rounded-lg border">
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
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Latency
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    Enquiry Ref
                  </th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((decision) => (
                  <tr
                    key={decision.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
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
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${getConfidenceColor(decision.confidenceScore)} ${getConfidenceBg(decision.confidenceScore)}`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            decision.confidenceScore >= 0.9
                              ? "bg-emerald-500"
                              : decision.confidenceScore >= 0.7
                                ? "bg-blue-500"
                                : decision.confidenceScore >= 0.5
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                          }`}
                        />
                        {(decision.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={getActionBadgeVariant(decision.actionTaken)}
                      >
                        {ACTION_LABELS[decision.actionTaken]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      ${decision.estimatedCostUsd.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {decision.latencyMs}ms
                    </td>
                    <td className="px-4 py-3">
                      {decision.enquiry ? (
                        <Link
                          href={`/enquiries/${decision.enquiryId}`}
                          className="text-primary hover:underline"
                        >
                          {decision.enquiry.referenceNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PER_PAGE + 1} to{" "}
                {Math.min(currentPage * PER_PAGE, totalCount)} of {totalCount}{" "}
                decisions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  asChild={currentPage > 1}
                >
                  {currentPage > 1 ? (
                    <Link
                      href={buildUrl({ page: String(currentPage - 1) })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </span>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  asChild={currentPage < totalPages}
                >
                  {currentPage < totalPages ? (
                    <Link
                      href={buildUrl({ page: String(currentPage + 1) })}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
