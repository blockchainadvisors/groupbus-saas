import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Brain,
  DollarSign,
  Clock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

interface EnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getEnquiry(id: string) {
  return prisma.enquiry.findUnique({
    where: { id, deletedAt: null },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          organisationId: true,
        },
      },
      supplierEnquiries: {
        include: {
          organisation: {
            select: {
              id: true,
              name: true,
              rating: true,
            },
          },
          supplierQuote: true,
        },
        orderBy: { aiRank: "asc" },
      },
      customerQuotes: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
      aiDecisionLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function generateMetadata({
  params,
}: EnquiryDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    select: { referenceNumber: true },
  });

  if (!enquiry) {
    return { title: "Enquiry Not Found" };
  }

  return {
    title: `Enquiry ${enquiry.referenceNumber}`,
  };
}

export default async function EnquiryDetailPage({
  params,
}: EnquiryDetailPageProps) {
  const user = await requireAuth();
  const { id } = await params;

  const enquiry = await getEnquiry(id);

  if (!enquiry) {
    notFound();
  }

  // If CLIENT, only allow viewing their own enquiries
  if (user.role === "CLIENT" && enquiry.customerId !== user.id) {
    notFound();
  }

  const vehicleTypeLabel = enquiry.vehicleType
    ? enquiry.vehicleType.replace(/_/g, " ")
    : "Not specified";
  const tripTypeLabel = enquiry.tripType.replace(/_/g, " ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Enquiry ${enquiry.referenceNumber}`}
        description={`Status: ${enquiry.status.replace(/_/g, " ")}`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/enquiries">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Enquiries
          </Link>
        </Button>
      </PageHeader>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <StatusBadge status={enquiry.status} />
        <span className="text-sm text-muted-foreground">
          Created {formatDateTime(enquiry.createdAt)}
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
            <DetailRow label="Pickup Location" value={enquiry.pickupLocation} />
            <DetailRow
              label="Dropoff Location"
              value={enquiry.dropoffLocation ?? "Not specified"}
            />
            <DetailRow
              label="Departure Date"
              value={formatDate(enquiry.departureDate)}
            />
            {enquiry.departureTime && (
              <DetailRow label="Departure Time" value={enquiry.departureTime} />
            )}
            {enquiry.returnDate && (
              <DetailRow
                label="Return Date"
                value={formatDate(enquiry.returnDate)}
              />
            )}
            {enquiry.returnTime && (
              <DetailRow label="Return Time" value={enquiry.returnTime} />
            )}
            <DetailRow label="Trip Type" value={tripTypeLabel} />
            <DetailRow
              label="Passengers"
              value={String(enquiry.passengerCount)}
            />
            <DetailRow label="Vehicle Type" value={vehicleTypeLabel} />
            {enquiry.specialRequirements.length > 0 && (
              <div>
                <dt className="text-sm text-muted-foreground">
                  Special Requirements
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {enquiry.specialRequirements.map((req, i) => (
                    <Badge key={i} variant="outline">
                      {req}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            {enquiry.additionalNotes && (
              <DetailRow label="Notes" value={enquiry.additionalNotes} />
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Name" value={enquiry.contactName} />
            <DetailRow label="Email" value={enquiry.contactEmail} />
            <DetailRow label="Phone" value={enquiry.contactPhone} />
            {enquiry.companyName && (
              <DetailRow label="Company" value={enquiry.companyName} />
            )}
            <DetailRow
              label="Source"
              value={enquiry.source.charAt(0) + enquiry.source.slice(1).toLowerCase()}
            />
            {enquiry.budgetMin != null && enquiry.budgetMax != null && (
              <DetailRow
                label="Budget Range"
                value={`${formatCurrency(enquiry.budgetMin)} - ${formatCurrency(enquiry.budgetMax)}`}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Analysis */}
      {(enquiry.aiComplexityScore != null ||
        enquiry.aiSuggestedVehicle != null ||
        enquiry.aiEstimatedPriceMin != null ||
        enquiry.aiQualityScore != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {enquiry.aiComplexityScore != null && (
                <AiMetricCard
                  label="Complexity Score"
                  value={`${(enquiry.aiComplexityScore * 100).toFixed(0)}%`}
                  score={enquiry.aiComplexityScore}
                />
              )}
              {enquiry.aiQualityScore != null && (
                <AiMetricCard
                  label="Quality Score"
                  value={`${(enquiry.aiQualityScore * 100).toFixed(0)}%`}
                  score={enquiry.aiQualityScore}
                />
              )}
              {enquiry.aiSuggestedVehicle != null && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Suggested Vehicle
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {enquiry.aiSuggestedVehicle.replace(/_/g, " ")}
                  </p>
                </div>
              )}
              {enquiry.aiEstimatedPriceMin != null &&
                enquiry.aiEstimatedPriceMax != null && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Estimated Price Range
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatCurrency(enquiry.aiEstimatedPriceMin)} &ndash;{" "}
                      {formatCurrency(enquiry.aiEstimatedPriceMax)}
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier Bids - Enhanced with AI comparison */}
      {enquiry.supplierEnquiries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Supplier Bids
              {enquiry.supplierEnquiries.some((se) => se.supplierQuote) && (
                <Badge variant="secondary" className="ml-2">
                  {enquiry.supplierEnquiries.filter((se) => se.supplierQuote).length} of{" "}
                  {enquiry.supplierEnquiries.length} received
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">
                      AI Rank
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      AI Score
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Quote Total
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Fairness
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Flags
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Quote Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enquiry.supplierEnquiries.map((se) => {
                    const isWinner = se.supplierQuote?.status === "ACCEPTED";
                    return (
                      <tr
                        key={se.id}
                        className={`border-b last:border-b-0 transition-colors ${
                          isWinner
                            ? "bg-emerald-50 dark:bg-emerald-950/20"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isWinner && (
                              <Trophy className="h-4 w-4 text-amber-500" />
                            )}
                            <Link
                              href={`/suppliers/${se.organisationId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {se.organisation.name}
                            </Link>
                          </div>
                          {se.organisation.rating != null && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Rating: {se.organisation.rating.toFixed(1)}/5.0
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={se.status} />
                        </td>
                        <td className="px-4 py-3">
                          {se.aiRank != null ? (
                            <span className={`font-semibold ${se.aiRank === 1 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                              #{se.aiRank}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {se.aiScore != null ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  se.aiScore >= 0.7
                                    ? "bg-emerald-500"
                                    : se.aiScore >= 0.4
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                              />
                              {(se.aiScore * 100).toFixed(0)}%
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {se.supplierQuote
                            ? formatCurrency(se.supplierQuote.totalPrice)
                            : "--"}
                        </td>
                        <td className="px-4 py-3">
                          {se.supplierQuote?.aiFairnessScore != null ? (
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className={`h-3.5 w-3.5 ${
                                se.supplierQuote.aiFairnessScore >= 70
                                  ? "text-emerald-500"
                                  : se.supplierQuote.aiFairnessScore >= 40
                                    ? "text-amber-500"
                                    : "text-red-500"
                              }`} />
                              <span className="text-xs font-medium">
                                {se.supplierQuote.aiFairnessScore.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {se.supplierQuote?.aiAnomalyFlag && (
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Anomaly</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {se.supplierQuote ? (
                            <StatusBadge status={se.supplierQuote.status} />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Awaiting bid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/suppliers/${se.organisationId}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* AI Reasoning summary for bids */}
            {enquiry.supplierEnquiries.some((se) => se.supplierQuote?.aiReasoning) && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4" />
                  AI Bid Analysis
                </h4>
                <div className="space-y-2">
                  {enquiry.supplierEnquiries
                    .filter((se) => se.supplierQuote?.aiReasoning)
                    .map((se) => (
                      <div key={se.id} className="text-sm">
                        <span className="font-medium">{se.organisation.name}:</span>{" "}
                        <span className="text-muted-foreground">
                          {se.supplierQuote!.aiReasoning}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Quotes */}
      {enquiry.customerQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Customer Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Ref #</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Total Price
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Markup</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Valid Until
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enquiry.customerQuotes.map((cq) => (
                    <tr
                      key={cq.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/quotes/${cq.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {cq.referenceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(cq.totalPrice)}
                      </td>
                      <td className="px-4 py-3">
                        {cq.markupPercentage.toFixed(1)}%
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatCurrency(cq.markupAmount)})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cq.status} />
                      </td>
                      <td className="px-4 py-3">
                        {cq.validUntil
                          ? formatDate(cq.validUntil)
                          : "--"}
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
      {enquiry.statusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {enquiry.statusHistory.map((entry, index) => (
                <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                  {/* Vertical line */}
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    {index < enquiry.statusHistory.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 -mt-0.5">
                    <div className="flex items-center gap-2">
                      {entry.fromStatus && (
                        <>
                          <StatusBadge status={entry.fromStatus} />
                          <span className="text-xs text-muted-foreground">
                            &rarr;
                          </span>
                        </>
                      )}
                      <StatusBadge status={entry.toStatus} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Decision Log */}
      {enquiry.aiDecisionLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Decision Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Task Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Action Taken
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Model</th>
                    <th className="px-4 py-3 text-left font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiry.aiDecisionLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {log.taskType.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.actionTaken} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              log.confidenceScore >= 0.7
                                ? "bg-emerald-500"
                                : log.confidenceScore >= 0.4
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                          />
                          {(log.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{log.model}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        ${log.estimatedCostUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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

function AiMetricCard({
  label,
  value,
  score,
}: {
  label: string;
  value: string;
  score: number;
}) {
  let borderColor: string;
  if (score >= 0.7) {
    borderColor = "border-emerald-500";
  } else if (score >= 0.4) {
    borderColor = "border-amber-500";
  } else {
    borderColor = "border-red-500";
  }

  let textColor: string;
  if (score >= 0.7) {
    textColor = "text-emerald-600 dark:text-emerald-400";
  } else if (score >= 0.4) {
    textColor = "text-amber-600 dark:text-amber-400";
  } else {
    textColor = "text-red-600 dark:text-red-400";
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${borderColor}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
