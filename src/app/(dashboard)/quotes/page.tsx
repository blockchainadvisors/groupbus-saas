import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency, truncate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Quotes",
};

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Markup Applied", value: "MARKUP_APPLIED" },
  { label: "Sent to Customer", value: "SENT_TO_CUSTOMER" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
] as const;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() ?? "";
  const statusFilter = params.status?.trim() ?? "";

  // Build where clause
  const where: Record<string, unknown> = {};

  // Role-based filtering: CLIENT users only see their own enquiries' quotes
  if (user.role === "CLIENT") {
    where.enquiry = { customerId: user.id };
  }

  // Search filter
  if (search) {
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { enquiry: { contactName: { contains: search, mode: "insensitive" } } },
    ];
  }

  // Status filter
  if (statusFilter) {
    where.status = statusFilter;
  }

  const [quotes, total] = await Promise.all([
    prisma.customerQuote.findMany({
      where,
      include: {
        enquiry: {
          select: {
            referenceNumber: true,
            contactName: true,
            contactEmail: true,
            pickupLocation: true,
            dropoffLocation: true,
            departureDate: true,
          },
        },
        supplierQuote: {
          select: {
            totalPrice: true,
            organisation: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customerQuote.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(page: number, searchValue: string, status: string) {
    const urlParams = new URLSearchParams();
    if (page > 1) urlParams.set("page", String(page));
    if (searchValue) urlParams.set("search", searchValue);
    if (status) urlParams.set("status", status);
    const qs = urlParams.toString();
    return qs ? `/quotes?${qs}` : "/quotes";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="View and manage customer quotes."
      />

      {/* Search and Filters */}
      <div className="space-y-4">
        <form method="GET" action="/quotes" className="flex items-center gap-2">
          {statusFilter && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by reference or customer name..."
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {(search || statusFilter) && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/quotes">Clear</Link>
            </Button>
          )}
        </form>

        {/* Status filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <Link
                key={filter.value}
                href={buildUrl(1, search, filter.value)}
              >
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1 text-xs"
                >
                  {filter.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {total === 0 ? (
          "No quotes found."
        ) : (
          <>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}
            &ndash;
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} quotes
          </>
        )}
      </div>

      {/* Table */}
      {quotes.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Trip</th>
                <th className="px-4 py-3 text-left font-medium">Supplier</th>
                <th className="px-4 py-3 text-right font-medium">
                  Supplier Price
                </th>
                <th className="px-4 py-3 text-right font-medium">Markup %</th>
                <th className="px-4 py-3 text-right font-medium">
                  Total Price
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {quote.referenceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {quote.enquiry.contactName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quote.enquiry.contactEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[180px] truncate">
                      {truncate(quote.enquiry.pickupLocation, 30)}
                    </div>
                    {quote.enquiry.dropoffLocation && (
                      <div className="text-xs text-muted-foreground max-w-[180px] truncate">
                        &rarr;{" "}
                        {truncate(quote.enquiry.dropoffLocation, 30)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {quote.supplierQuote.organisation.name}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">
                    {formatCurrency(quote.supplierPrice)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {quote.markupPercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">
                    {formatCurrency(quote.totalPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(quote.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/quotes/${quote.id}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No quotes yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {search || statusFilter
              ? "No quotes match your current filters. Try adjusting your search or status filter."
              : "Quotes generated from supplier bids will appear here."}
          </p>
          {(search || statusFilter) && (
            <Button asChild variant="outline" className="mt-6">
              <Link href="/quotes">Clear Filters</Link>
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl(currentPage - 1, search, statusFilter)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
            )}
            {currentPage < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl(currentPage + 1, search, statusFilter)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
