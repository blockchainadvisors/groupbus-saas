import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Plus, Search, Pencil, Eye } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Survey Templates",
};

const PAGE_SIZE = 10;

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() ?? "";

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [templates, totalCount] = await Promise.all([
    prisma.surveyTemplate.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        questions: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            surveyResponses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.surveyTemplate.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildUrl(page: number, searchValue: string) {
    const urlParams = new URLSearchParams();
    if (page > 1) urlParams.set("page", String(page));
    if (searchValue) urlParams.set("search", searchValue);
    const qs = urlParams.toString();
    return qs ? `/surveys?${qs}` : "/surveys";
  }

  function typeLabel(type: string) {
    switch (type) {
      case "CUSTOMER_POST_TRIP":
        return "Customer Post-Trip";
      case "SUPPLIER_POST_TRIP":
        return "Supplier Post-Trip";
      default:
        return type;
    }
  }

  function typeVariant(type: string) {
    switch (type) {
      case "CUSTOMER_POST_TRIP":
        return "info" as const;
      case "SUPPLIER_POST_TRIP":
        return "warning" as const;
      default:
        return "secondary" as const;
    }
  }

  function getQuestionsCount(questions: unknown): number {
    if (Array.isArray(questions)) {
      return questions.length;
    }
    return 0;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Survey Templates"
        description="Manage survey templates for post-trip feedback collection."
      >
        <Button asChild>
          <Link href="/surveys/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </PageHeader>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search by name or description..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {search && (
              <Button asChild variant="ghost">
                <Link href="/surveys">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {templates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No survey templates found"
          description={
            search
              ? "No templates match your search criteria. Try a different search term."
              : "Create a survey template to start collecting post-trip feedback."
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
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Questions
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Responses
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/surveys/${template.id}`}
                          className="hover:underline"
                        >
                          {template.name}
                        </Link>
                        {template.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={typeVariant(template.type)}>
                          {typeLabel(template.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {getQuestionsCount(template.questions)}
                      </td>
                      <td className="px-4 py-3">
                        {template._count.surveyResponses}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(template.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={template.isActive ? "success" : "secondary"}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/surveys/${template.id}`}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>
                        </div>
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
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}{" "}
                templates
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                >
                  <Link
                    href={buildUrl(currentPage - 1, search)}
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
                    href={buildUrl(currentPage + 1, search)}
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
