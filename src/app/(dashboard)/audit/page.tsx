import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import { ScrollText, Search } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Audit Log",
};

const PAGE_SIZE = 20;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    entityType?: string;
  }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() ?? "";
  const entityTypeFilter = params.entityType ?? "";

  // Fetch all unique entity types for the filter dropdown
  const entityTypes = await prisma.auditLog.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });

  const uniqueEntityTypes = entityTypes.map((e) => e.entityType);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (entityTypeFilter) {
    where.entityType = entityTypeFilter;
  }

  if (search) {
    where.OR = [
      { entityId: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(page: number, searchValue: string, entityType: string) {
    const urlParams = new URLSearchParams();
    if (page > 1) urlParams.set("page", String(page));
    if (searchValue) urlParams.set("search", searchValue);
    if (entityType) urlParams.set("entityType", entityType);
    const qs = urlParams.toString();
    return qs ? `/audit?${qs}` : "/audit";
  }

  function truncateJson(value: unknown, maxLength = 80): string {
    if (value === null || value === undefined) return "-";
    try {
      const str =
        typeof value === "string" ? value : JSON.stringify(value);
      if (str.length <= maxLength) return str;
      return str.slice(0, maxLength - 3) + "...";
    } catch {
      return "-";
    }
  }

  function actionVariant(action: string) {
    const lower = action.toLowerCase();
    if (lower.includes("create") || lower.includes("add"))
      return "success" as const;
    if (lower.includes("delete") || lower.includes("remove"))
      return "destructive" as const;
    if (lower.includes("update") || lower.includes("edit"))
      return "warning" as const;
    return "secondary" as const;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Browse all system audit events."
      />

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex items-center gap-4">
            {/* Preserve entityType filter when searching */}
            {entityTypeFilter && (
              <input
                type="hidden"
                name="entityType"
                value={entityTypeFilter}
              />
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search by entity ID or action..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {(search || entityTypeFilter) && (
              <Button asChild variant="ghost">
                <Link href="/audit">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Entity Type Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="text-sm font-medium text-muted-foreground">
          Entity Type:
        </span>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={!entityTypeFilter ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={buildUrl(1, search, "")}>All</Link>
          </Button>
          {uniqueEntityTypes.map((type) => (
            <Button
              key={type}
              variant={entityTypeFilter === type ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={buildUrl(1, search, type)}>{type}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-muted-foreground">
        {total === 0 ? (
          "No audit logs found."
        ) : (
          <>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}
            &ndash;
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} entries
          </>
        )}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs found"
          description={
            search || entityTypeFilter
              ? "No audit logs match your search criteria. Try a different search term or filter."
              : "No audit events have been recorded yet."
          }
        />
      ) : (
        <>
          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Entity Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Entity ID
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Actor</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={actionVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{log.entityType}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.entityId}
                      </td>
                      <td className="px-4 py-3">
                        {log.actor ? (
                          <div>
                            <div className="font-medium">
                              {log.actor.firstName} {log.actor.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.actor.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span
                          className="block truncate font-mono text-xs text-muted-foreground"
                          title={
                            log.changes
                              ? JSON.stringify(log.changes)
                              : undefined
                          }
                        >
                          {truncateJson(log.changes)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                >
                  <Link
                    href={buildUrl(currentPage - 1, search, entityTypeFilter)}
                    aria-disabled={currentPage <= 1}
                    className={
                      currentPage <= 1
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    Previous
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                >
                  <Link
                    href={buildUrl(currentPage + 1, search, entityTypeFilter)}
                    aria-disabled={currentPage >= totalPages}
                    className={
                      currentPage >= totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
