import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Bookings",
};

const PAGE_SIZE = 20;

const statusFilters = [
  { value: "", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SUPPLIER_ASSIGNED", label: "Assigned" },
  { value: "SUPPLIER_ACCEPTED", label: "Accepted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;

  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() ?? "";
  const statusFilter = params.status ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    deletedAt: null,
  };

  if (user.role === "CLIENT") {
    where.enquiry = { customerId: user.id };
  }

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { enquiry: { contactName: { contains: search, mode: "insensitive" } } },
      { enquiry: { referenceNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
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
            passengerCount: true,
          },
        },
        organisation: {
          select: { name: true },
        },
        customerQuote: {
          select: { totalPrice: true, currency: true, referenceNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(page: number) {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    const qs = p.toString();
    return qs ? `/bookings?${qs}` : "/bookings";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Manage confirmed bookings and track trip status."
      />

      {/* Search + status filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <form method="GET" action="/bookings" className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by ref or customer..."
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {(search || statusFilter) && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/bookings">Clear</Link>
            </Button>
          )}
        </form>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {statusFilters.map((sf) => (
          <Button
            key={sf.value}
            asChild
            variant={statusFilter === sf.value ? "default" : "outline"}
            size="sm"
          >
            <Link
              href={
                sf.value
                  ? `/bookings?status=${sf.value}${search ? `&search=${search}` : ""}`
                  : `/bookings${search ? `?search=${search}` : ""}`
              }
            >
              {sf.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {total === 0 ? (
          "No bookings found."
        ) : (
          <>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}&ndash;
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} bookings
          </>
        )}
      </div>

      {/* Table */}
      {bookings.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Booking Ref</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Route</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Supplier</th>
                <th className="px-4 py-3 text-left font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {booking.referenceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{booking.enquiry.contactName}</div>
                    <div className="text-xs text-muted-foreground">
                      {booking.enquiry.contactEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[200px] truncate">
                      {booking.enquiry.pickupLocation}
                    </div>
                    {booking.enquiry.dropoffLocation && (
                      <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                        &rarr; {booking.enquiry.dropoffLocation}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(booking.enquiry.departureDate)}
                  </td>
                  <td className="px-4 py-3">
                    {booking.organisation.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {formatCurrency(booking.customerQuote.totalPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(booking.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            {search || statusFilter
              ? "No bookings match your filters."
              : "No bookings yet. Bookings are created when customers accept quotes and complete payment."}
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
                <Link href={buildUrl(currentPage - 1)}>
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
                <Link href={buildUrl(currentPage + 1)}>
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
