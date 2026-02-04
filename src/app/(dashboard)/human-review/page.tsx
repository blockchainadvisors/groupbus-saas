import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { AiTaskType, HumanReviewReason, HumanReviewStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Human Review",
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

const REASON_LABELS: Record<HumanReviewReason, string> = {
  LOW_CONFIDENCE: "Low Confidence",
  AI_FAILURE: "AI Failure",
  POLICY_ESCALATION: "Policy",
  LOW_SUPPLIER_RATING: "Low Supplier Rating",
  ANOMALOUS_PRICING: "Anomalous Pricing",
};

function getReasonBadgeVariant(reason: HumanReviewReason) {
  switch (reason) {
    case "LOW_CONFIDENCE":
      return "warning" as const;
    case "AI_FAILURE":
      return "destructive" as const;
    case "POLICY_ESCALATION":
      return "info" as const;
    case "ANOMALOUS_PRICING":
      return "destructive" as const;
    case "LOW_SUPPLIER_RATING":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

const STATUS_LABELS: Record<HumanReviewStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

function getStatusBadgeVariant(status: HumanReviewStatus) {
  switch (status) {
    case "PENDING":
      return "warning" as const;
    case "IN_REVIEW":
      return "info" as const;
    case "RESOLVED":
      return "success" as const;
    case "DISMISSED":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

const STATUS_VALUES: HumanReviewStatus[] = [
  "PENDING",
  "IN_REVIEW",
  "RESOLVED",
  "DISMISSED",
];

export default async function HumanReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const statusFilter = params.status as HumanReviewStatus | undefined;

  const where = statusFilter ? { status: statusFilter } : {};

  const [tasks, totalCount, pendingCount] = await Promise.all([
    prisma.humanReviewTask.findMany({
      where,
      select: {
        id: true,
        taskType: true,
        status: true,
        reason: true,
        createdAt: true,
        resolvedAt: true,
        resolvedBy: true,
        enquiryId: true,
        enquiry: {
          select: {
            referenceNumber: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.humanReviewTask.count({ where }),
    prisma.humanReviewTask.count({ where: { status: "PENDING" } }),
  ]);

  // Fetch resolver user details for tasks that have been resolved
  const resolverIds = tasks
    .map((t) => t.resolvedBy)
    .filter((id): id is string => id !== null);

  const resolvers =
    resolverIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: resolverIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

  const resolverMap = new Map(resolvers.map((r) => [r.id, r]));

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (overrides.page && overrides.page !== "1") p.set("page", overrides.page);
    if (overrides.status ?? statusFilter)
      p.set("status", (overrides.status ?? statusFilter)!);
    const qs = p.toString();
    return `/human-review${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Human Review"
        description="Review tasks escalated by the AI system."
      >
        {pendingCount > 0 && (
          <Badge variant="warning" className="text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </PageHeader>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Filter by status:
        </span>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={!statusFilter ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href="/human-review">All</Link>
          </Button>
          {STATUS_VALUES.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={buildUrl({ status: s, page: "1" })}>
                {STATUS_LABELS[s]}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks awaiting review"
          description="Tasks escalated by the AI due to low confidence will appear here."
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
                  <th className="px-4 py-3 text-left font-medium">
                    Enquiry Ref
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Resolved By
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const resolver = task.resolvedBy
                    ? resolverMap.get(task.resolvedBy)
                    : null;

                  return (
                    <tr
                      key={task.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(task.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {TASK_TYPE_LABELS[task.taskType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {task.enquiry ? (
                          <Link
                            href={`/enquiries/${task.enquiryId}`}
                            className="text-primary hover:underline"
                          >
                            {task.enquiry.referenceNumber}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getReasonBadgeVariant(task.reason)}>
                          {REASON_LABELS[task.reason]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {STATUS_LABELS[task.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {resolver ? (
                          <span>
                            {resolver.firstName} {resolver.lastName}
                          </span>
                        ) : task.resolvedAt ? (
                          <span className="text-muted-foreground">System</span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.status === "PENDING" && task.enquiryId ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/enquiries/${task.enquiryId}`}>
                              Review
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        ) : task.status === "IN_REVIEW" && task.enquiryId ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/enquiries/${task.enquiryId}`}>
                              Continue
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        ) : task.resolvedAt ? (
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(task.resolvedAt)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PER_PAGE + 1} to{" "}
                {Math.min(currentPage * PER_PAGE, totalCount)} of {totalCount}{" "}
                tasks
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
