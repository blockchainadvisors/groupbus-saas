import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Building2,
  CreditCard,
  Clock,
  User,
  FileText,
} from "lucide-react";

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id, deletedAt: null },
    include: {
      enquiry: {
        select: {
          id: true,
          referenceNumber: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          companyName: true,
          pickupLocation: true,
          dropoffLocation: true,
          departureDate: true,
          departureTime: true,
          returnDate: true,
          returnTime: true,
          tripType: true,
          passengerCount: true,
          vehicleType: true,
          specialRequirements: true,
          additionalNotes: true,
          customerId: true,
        },
      },
      organisation: {
        select: { id: true, name: true, email: true, phone: true },
      },
      customerQuote: {
        select: {
          referenceNumber: true,
          supplierPrice: true,
          markupPercentage: true,
          markupAmount: true,
          subtotal: true,
          vatRate: true,
          vatAmount: true,
          totalPrice: true,
          currency: true,
        },
      },
      vehicle: {
        select: { registrationNumber: true, type: true, capacity: true },
      },
      driver: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          licenseNumber: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: BookingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { referenceNumber: true },
  });

  if (!booking) {
    return { title: "Booking Not Found" };
  }

  return {
    title: `Booking ${booking.referenceNumber}`,
  };
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  if (user.role === "CLIENT" && booking.enquiry.customerId !== user.id) {
    notFound();
  }

  const tripTypeLabel = booking.enquiry.tripType.replace(/_/g, " ");
  const vehicleTypeLabel = booking.enquiry.vehicleType
    ? booking.enquiry.vehicleType.replace(/_/g, " ")
    : "Not specified";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Booking ${booking.referenceNumber}`}
        description={`Enquiry: ${booking.enquiry.referenceNumber}`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/bookings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bookings
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <StatusBadge status={booking.status} />
        <span className="text-sm text-muted-foreground">
          Booked {formatDateTime(booking.createdAt)}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Trip Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Trip Type" value={tripTypeLabel} />
            <DetailRow label="Pickup" value={booking.enquiry.pickupLocation} />
            <DetailRow
              label="Dropoff"
              value={booking.enquiry.dropoffLocation ?? "Not specified"}
            />
            <DetailRow
              label="Departure Date"
              value={formatDate(booking.enquiry.departureDate)}
            />
            {booking.enquiry.departureTime && (
              <DetailRow label="Departure Time" value={booking.enquiry.departureTime} />
            )}
            {booking.enquiry.returnDate && (
              <DetailRow
                label="Return Date"
                value={formatDate(booking.enquiry.returnDate)}
              />
            )}
            {booking.enquiry.returnTime && (
              <DetailRow label="Return Time" value={booking.enquiry.returnTime} />
            )}
            <DetailRow label="Passengers" value={String(booking.enquiry.passengerCount)} />
            <DetailRow label="Vehicle Type" value={vehicleTypeLabel} />
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Name" value={booking.enquiry.contactName} />
            <DetailRow label="Email" value={booking.enquiry.contactEmail} />
            <DetailRow label="Phone" value={booking.enquiry.contactPhone} />
            {booking.enquiry.companyName && (
              <DetailRow label="Company" value={booking.enquiry.companyName} />
            )}
            {booking.enquiry.specialRequirements.length > 0 && (
              <div>
                <dt className="text-sm text-muted-foreground">Special Requirements</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {booking.enquiry.specialRequirements.map((req, i) => (
                    <Badge key={i} variant="outline">{req}</Badge>
                  ))}
                </dd>
              </div>
            )}
            {booking.enquiry.additionalNotes && (
              <DetailRow label="Notes" value={booking.enquiry.additionalNotes} />
            )}
          </CardContent>
        </Card>

        {/* Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Company" value={booking.organisation.name} />
            {booking.organisation.email && (
              <DetailRow label="Email" value={booking.organisation.email} />
            )}
            {booking.organisation.phone && (
              <DetailRow label="Phone" value={booking.organisation.phone} />
            )}
            {booking.vehicle && (
              <>
                <DetailRow
                  label="Vehicle"
                  value={`${booking.vehicle.type.replace(/_/g, " ")} (${booking.vehicle.capacity} seats)`}
                />
                <DetailRow
                  label="Registration"
                  value={booking.vehicle.registrationNumber}
                />
              </>
            )}
            {booking.driver && (
              <DetailRow
                label="Driver"
                value={`${booking.driver.firstName} ${booking.driver.lastName}`}
              />
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.role !== "CLIENT" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Supplier Price</span>
                  <span>{formatCurrency(booking.customerQuote.supplierPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Markup ({booking.customerQuote.markupPercentage.toFixed(1)}%)
                  </span>
                  <span>{formatCurrency(booking.customerQuote.markupAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(booking.customerQuote.subtotal)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                VAT ({booking.customerQuote.vatRate}%)
              </span>
              <span>{formatCurrency(booking.customerQuote.vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(booking.customerQuote.totalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      {booking.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {payment.description ?? "Payment"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {booking.statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {booking.statusHistory.map((entry, index) => (
                <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    {index < booking.statusHistory.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <div className="flex items-center gap-2">
                      {entry.fromStatus && (
                        <>
                          <StatusBadge status={entry.fromStatus} />
                          <span className="text-xs text-muted-foreground">&rarr;</span>
                        </>
                      )}
                      <StatusBadge status={entry.toStatus} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Related
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/enquiries/${booking.enquiryId}`}>
                View Enquiry ({booking.enquiry.referenceNumber})
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/quotes/${booking.customerQuoteId}`}>
                View Quote ({booking.customerQuote.referenceNumber})
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/suppliers/${booking.organisationId}`}>
                View Supplier
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
