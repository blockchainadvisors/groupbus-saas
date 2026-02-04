import { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { Users, Plus, Search, Pencil } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Users",
};

const PAGE_SIZE = 20;

const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "SUPERADMIN", label: "Superadmin" },
  { value: "ADMIN", label: "Admin" },
  { value: "CLIENT", label: "Client" },
  { value: "SUPPLIER", label: "Supplier" },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
  await requireSuperAdmin();

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() ?? "";
  const roleFilter = params.role ?? "";

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (
    roleFilter &&
    ["SUPERADMIN", "ADMIN", "CLIENT", "SUPPLIER"].includes(roleFilter)
  ) {
    where.role = roleFilter;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        organisation: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(page: number, searchValue: string, role: string) {
    const urlParams = new URLSearchParams();
    if (page > 1) urlParams.set("page", String(page));
    if (searchValue) urlParams.set("search", searchValue);
    if (role) urlParams.set("role", role);
    const qs = urlParams.toString();
    return qs ? `/users?${qs}` : "/users";
  }

  function roleVariant(role: string) {
    switch (role) {
      case "SUPERADMIN":
        return "destructive" as const;
      case "ADMIN":
        return "warning" as const;
      case "CLIENT":
        return "info" as const;
      case "SUPPLIER":
        return "success" as const;
      default:
        return "secondary" as const;
    }
  }

  function roleLabel(role: string) {
    switch (role) {
      case "SUPERADMIN":
        return "Super Admin";
      case "ADMIN":
        return "Admin";
      case "CLIENT":
        return "Client";
      case "SUPPLIER":
        return "Supplier";
      default:
        return role;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage platform users.">
        <Button asChild>
          <Link href="/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </PageHeader>

      {/* Search */}
      <Card>
        <div className="p-6">
          <form method="GET" className="flex items-center gap-4">
            {/* Preserve the role filter when searching */}
            {roleFilter && (
              <input type="hidden" name="role" value={roleFilter} />
            )}
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
                <Link href={buildUrl(1, "", roleFilter)}>Clear</Link>
              </Button>
            )}
          </form>
        </div>
      </Card>

      {/* Role filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {ROLE_TABS.map((tab) => (
          <Button
            key={tab.value}
            asChild
            variant={roleFilter === tab.value ? "default" : "ghost"}
            size="sm"
          >
            <Link href={buildUrl(1, search, tab.value)}>{tab.label}</Link>
          </Button>
        ))}
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {total === 0 ? (
          "No users found."
        ) : (
          <>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}
            &ndash;
            {Math.min(currentPage * PAGE_SIZE, total)} of {total} users
          </>
        )}
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={
            search || roleFilter
              ? "No users match your search criteria. Try a different search term or filter."
              : "No users yet. Add users to get started."
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
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Organisation
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Created</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleVariant(user.role)}>
                          {roleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.organisation?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={user.isActive ? "success" : "secondary"}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/users/${user.id}/edit`}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
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
                    href={buildUrl(currentPage - 1, search, roleFilter)}
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
                    href={buildUrl(currentPage + 1, search, roleFilter)}
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
