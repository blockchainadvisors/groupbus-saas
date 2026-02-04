import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Star,
  Truck,
  Users,
  ClipboardList,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Supplier Details",
};

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const organisation = await prisma.organisation.findFirst({
    where: { id, type: "SUPPLIER", deletedAt: null },
    include: {
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
      vehicles: {
        select: {
          id: true,
          type: true,
          registrationNumber: true,
          make: true,
          model: true,
          capacity: true,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      },
      supplierEnquiries: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          enquiry: {
            select: {
              referenceNumber: true,
              status: true,
            },
          },
          supplierQuote: {
            select: {
              totalPrice: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!organisation) {
    notFound();
  }

  function renderStars(rating: number) {
    const stars: string[] = [];
    for (let i = 0; i < 5; i++) {
      stars.push(i < Math.floor(rating) ? "filled" : "empty");
    }
    return stars;
  }

  const activeVehicles = organisation.vehicles.filter((v) => v.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={organisation.name}
        description="Supplier organisation details"
      >
        <Button asChild variant="outline">
          <Link href="/suppliers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Suppliers
          </Link>
        </Button>
      </PageHeader>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>General supplier information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {organisation.email || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">
                  {organisation.phone || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">
                  {[organisation.address, organisation.city, organisation.postcode]
                    .filter(Boolean)
                    .join(", ") || "Not provided"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(organisation.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge
                  variant={organisation.isActive ? "success" : "secondary"}
                  className="mt-1"
                >
                  {organisation.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance
          </CardTitle>
          <CardDescription>Supplier performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Rating
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(organisation.rating).map((type, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        type === "filled"
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-bold">
                  {organisation.rating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Reliability
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-3xl font-bold ${
                    organisation.reliabilityScore >= 80
                      ? "text-emerald-600"
                      : organisation.reliabilityScore >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {organisation.reliabilityScore.toFixed(0)}
                </span>
                <span className="text-lg text-muted-foreground">%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${
                    organisation.reliabilityScore >= 80
                      ? "bg-emerald-500"
                      : organisation.reliabilityScore >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(100, organisation.reliabilityScore)}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Jobs Completed
              </p>
              <p className="text-3xl font-bold">
                {organisation.totalJobsCompleted}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fleet
          </CardTitle>
          <CardDescription>
            {organisation.vehicles.length} vehicle
            {organisation.vehicles.length !== 1 ? "s" : ""} ({activeVehicles}{" "}
            active)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organisation.vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No vehicles registered for this supplier.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      Reg Number
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Make / Model
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {organisation.vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-mono font-medium">
                        {vehicle.registrationNumber}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3">
                        {[vehicle.make, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {vehicle.capacity} seats
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={vehicle.isActive ? "success" : "secondary"}
                        >
                          {vehicle.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </CardTitle>
          <CardDescription>
            {organisation.users.length} user
            {organisation.users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organisation.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users associated with this supplier.
            </p>
          ) : (
            <div className="space-y-3">
              {organisation.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    <Badge
                      variant={user.isActive ? "success" : "secondary"}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Enquiries Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Enquiries
          </CardTitle>
          <CardDescription>
            Last 10 enquiries this supplier was contacted for
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organisation.supplierEnquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This supplier has not been contacted for any enquiries yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      Enquiry Ref
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Enquiry Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Supplier Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      AI Rank
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Bid Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {organisation.supplierEnquiries.map((se) => (
                    <tr
                      key={se.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        {se.enquiry.referenceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={se.enquiry.status} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={se.status} />
                      </td>
                      <td className="px-4 py-3">
                        {se.aiRank != null ? `#${se.aiRank}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {se.supplierQuote
                          ? formatCurrency(se.supplierQuote.totalPrice)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
