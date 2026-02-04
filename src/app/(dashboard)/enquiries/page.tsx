import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Enquiries",
};

const PAGE_SIZE = 20;

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() ?? "";

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  // If the user is a CLIENT, only show their enquiries
  if (user.role === "CLIENT") {
    where.customerId = user.id;
  }

  // Search filter
  if (search) {
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        contactName: true,
        contactEmail: true,
        pickupLocation: true,
        dropoffLocation: true,
        departureDate: true,
        passengerCount: true,
        vehicleType: true,
        tripType: true,
        createdAt: true,
        aiComplexityScore: true,
        aiSuggestedVehicle: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.enquiry.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(page: number, searchValue: string) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (searchValue) params.set("search", searchValue);
    const qs = params.toString();
    return qs ? `/enquiries?${qs}` : "/enquiries";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Enquiries" description="Manage customer enquiries.">
        <Button asChild>
          <Link href="/enquiry">
            <Plus className="mr-2 h-4 w-4" />
            New Enquiry
          </Link>
        </Button>
      </PageHeader>

      {/* Search */}
      <form method="GET" action="/enquiries" className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by ref, name, or email..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        {search && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/enquiries">Clear</Link>
          </Button>
        )}
      </form>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {total === 0 ? (
          "No enquiries found."
        ) : (
          <>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}
            &ndash;
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} enquiries
          </>
        )}
      </div>

      {/* Table */}
      {enquiries.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Ref #</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Route</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Passengers</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">AI Score</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enquiry) => (
                <tr
                  key={enquiry.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/enquiries/${enquiry.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {enquiry.referenceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{enquiry.contactName}</div>
                    <div className="text-xs text-muted-foreground">
                      {enquiry.contactEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[200px] truncate">
                      {enquiry.pickupLocation}
                    </div>
                    {enquiry.dropoffLocation && (
                      <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                        &rarr; {enquiry.dropoffLocation}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(enquiry.departureDate)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {enquiry.passengerCount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={enquiry.status} />
                  </td>
                  <td className="px-4 py-3">
                    {enquiry.aiComplexityScore != null ? (
                      <AiScoreIndicator score={enquiry.aiComplexityScore} />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(enquiry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {search
              ? "No enquiries match your search."
              : "No enquiries yet. Create your first enquiry to get started."}
          </p>
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
                <Link href={buildUrl(currentPage - 1, search)}>
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
                <Link href={buildUrl(currentPage + 1, search)}>
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

function AiScoreIndicator({ score }: { score: number }) {
  let colorClass: string;
  if (score >= 0.7) {
    colorClass = "bg-emerald-500";
  } else if (score >= 0.4) {
    colorClass = "bg-amber-500";
  } else {
    colorClass = "bg-red-500";
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span className="text-xs font-medium">{(score * 100).toFixed(0)}%</span>
    </div>
  );
}
