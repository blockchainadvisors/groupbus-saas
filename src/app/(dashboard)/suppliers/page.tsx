import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Truck, Plus, Eye, Star, Search } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Suppliers",
};

const PAGE_SIZE = 10;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const search = params.search?.trim() || "";

  const where = {
    type: "SUPPLIER" as const,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [suppliers, totalCount] = await Promise.all([
    prisma.organisation.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rating: true,
        totalJobsCompleted: true,
        reliabilityScore: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            vehicles: true,
            supplierEnquiries: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.organisation.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const stars: string[] = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < full ? "filled" : "empty");
    }
    return stars;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage supplier organisations.">
        <Button asChild>
          <Link href="/suppliers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Supplier
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
                placeholder="Search by name or email..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {search && (
              <Button asChild variant="ghost">
                <Link href="/suppliers">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers found"
          description={
            search
              ? "No suppliers match your search criteria. Try a different search term."
              : "Add supplier organisations to start sending them enquiries."
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
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Rating</th>
                    <th className="px-4 py-3 text-left font-medium">Jobs</th>
                    <th className="px-4 py-3 text-left font-medium">Reliability %</th>
                    <th className="px-4 py-3 text-left font-medium">Vehicles</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="hover:underline"
                        >
                          {supplier.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {supplier.email || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {renderStars(supplier.rating).map((type, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                type === "filled"
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {supplier.rating.toFixed(1)}/5
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {supplier.totalJobsCompleted}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            supplier.reliabilityScore >= 80
                              ? "text-emerald-600"
                              : supplier.reliabilityScore >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                          }
                        >
                          {supplier.reliabilityScore.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {supplier._count.vehicles}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={supplier.isActive ? "success" : "secondary"}
                        >
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/suppliers/${supplier.id}`}>
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
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}{" "}
                suppliers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                >
                  <Link
                    href={`/suppliers?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
                    href={`/suppliers?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
