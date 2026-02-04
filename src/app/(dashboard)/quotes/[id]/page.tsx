import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  User,
  Brain,
  PoundSterling,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  CreditCard,
  Hourglass,
} from "lucide-react";
import { SendQuoteButton, CopyButton } from "./quote-actions";

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getQuote(id: string) {
  return prisma.customerQuote.findUnique({
    where: { id },
    include: {
      enquiry: true,
      supplierQuote: {
        include: {
          organisation: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      booking: {
        select: {
          id: true,
          referenceNumber: true,
          status: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: QuoteDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await prisma.customerQuote.findUnique({
    where: { id },
    select: { referenceNumber: true },
  });

  if (!quote) {
    return { title: "Quote Not Found" };
  }

  return {
    title: `Quote ${quote.referenceNumber}`,
  };
}

export default async function QuoteDetailPage({
  params,
}: QuoteDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const quote = await getQuote(id);

  if (!quote) {
    notFound();
  }

  // Role check: CLIENT can only view their own enquiries' quotes
  if (user.role === "CLIENT" && quote.enquiry.customerId !== user.id) {
    notFound();
  }

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(user.role);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.groupbus.co.uk";
  const acceptanceLink = `${baseUrl}/quote/accept?token=${quote.acceptanceToken}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Quote ${quote.referenceNumber}`}
        description={`Enquiry ${quote.enquiry.referenceNumber}`}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={quote.status} />
          <Button asChild variant="outline" size="sm">
            <Link href="/quotes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quotes
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Trip Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Trip Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow
                label="Pickup Location"
                value={quote.enquiry.pickupLocation}
              />
              <DetailRow
                label="Dropoff Location"
                value={quote.enquiry.dropoffLocation ?? "Not specified"}
              />
              <DetailRow
                label="Departure Date"
                value={formatDate(quote.enquiry.departureDate)}
              />
              {quote.enquiry.departureTime && (
                <DetailRow
                  label="Departure Time"
                  value={quote.enquiry.departureTime}
                />
              )}
              {quote.enquiry.returnDate && (
                <DetailRow
                  label="Return Date"
                  value={formatDate(quote.enquiry.returnDate)}
                />
              )}
              <DetailRow
                label="Passengers"
                value={String(quote.enquiry.passengerCount)}
              />
              <DetailRow
                label="Trip Type"
                value={quote.enquiry.tripType.replace(/_/g, " ")}
              />
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow label="Name" value={quote.enquiry.contactName} />
              <DetailRow label="Email" value={quote.enquiry.contactEmail} />
              <DetailRow label="Phone" value={quote.enquiry.contactPhone} />
              {quote.enquiry.companyName && (
                <DetailRow label="Company" value={quote.enquiry.companyName} />
              )}
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {(quote.aiMarkupReasoning ||
            quote.aiAcceptanceProbability != null ||
            quote.aiDescription) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.aiAcceptanceProbability != null && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Acceptance Probability
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <AcceptanceProbabilityIndicator
                        probability={quote.aiAcceptanceProbability}
                      />
                    </dd>
                  </div>
                )}
                {quote.aiMarkupReasoning && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Markup Reasoning
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed">
                      {quote.aiMarkupReasoning}
                    </dd>
                  </div>
                )}
                {quote.aiDescription && (
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      AI Description
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed">
                      {quote.aiDescription}
                    </dd>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Price Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="h-4 w-4" />
                Price Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Supplier Price</span>
                <span>{formatCurrency(quote.supplierPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Markup ({quote.markupPercentage.toFixed(1)}%)
                </span>
                <span>+{formatCurrency(quote.markupAmount)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  VAT ({quote.vatRate}%)
                </span>
                <span>+{formatCurrency(quote.vatAmount)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-lg font-bold">
                  {formatCurrency(quote.totalPrice)}
                </span>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Currency: {quote.currency}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Supplier: {quote.supplierQuote.organisation.name}
              </div>
            </CardContent>
          </Card>

          {/* Status & Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Status & Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Current Status:
                </span>
                <StatusBadge status={quote.status} />
              </div>

              {quote.validUntil && (
                <DetailRow
                  label="Valid Until"
                  value={formatDateTime(quote.validUntil)}
                />
              )}
              {quote.sentAt && (
                <DetailRow
                  label="Sent At"
                  value={formatDateTime(quote.sentAt)}
                />
              )}
              {quote.respondedAt && (
                <DetailRow
                  label="Responded At"
                  value={formatDateTime(quote.respondedAt)}
                />
              )}

              <Separator />

              {/* Action buttons based on status */}
              {(quote.status === "DRAFT" ||
                quote.status === "MARKUP_APPLIED") &&
                isAdmin && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This quote is ready to be sent to the customer.
                    </p>
                    <SendQuoteButton quoteId={quote.id} />
                  </div>
                )}

              {quote.status === "SENT_TO_CUSTOMER" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Hourglass className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      Awaiting Customer Response
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="rounded-md border bg-muted/50 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Acceptance Link
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                          {acceptanceLink}
                        </code>
                        <CopyButton text={acceptanceLink} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {quote.status === "ACCEPTED" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Quote Accepted
                    </span>
                  </div>
                  {quote.booking && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bookings/${quote.booking.id}`}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        View Booking ({quote.booking.referenceNumber})
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {quote.status === "REJECTED" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-300">
                      Quote Rejected
                    </span>
                  </div>
                  {quote.declineReason && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                      <p className="text-xs font-medium text-red-800 dark:text-red-200">
                        Decline Reason
                      </p>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        {quote.declineReason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {quote.status === "EXPIRED" && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    This quote has expired
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {quote.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={payment.status} />
                          {payment.description && (
                            <span className="text-xs text-muted-foreground">
                              {payment.description}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(payment.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        {payment.refundedAmount > 0 && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Refunded: {formatCurrency(payment.refundedAmount, payment.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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

function AcceptanceProbabilityIndicator({
  probability,
}: {
  probability: number;
}) {
  const percentage = (probability * 100).toFixed(0);

  let colorClass: string;
  let textColor: string;
  if (probability >= 0.7) {
    colorClass = "bg-emerald-500";
    textColor = "text-emerald-600 dark:text-emerald-400";
  } else if (probability >= 0.4) {
    colorClass = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
  } else {
    colorClass = "bg-red-500";
    textColor = "text-red-600 dark:text-red-400";
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-semibold ${textColor}`}>
        {percentage}%
      </span>
    </div>
  );
}

