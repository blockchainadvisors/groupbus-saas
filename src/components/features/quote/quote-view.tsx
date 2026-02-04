"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Bus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Loader2,
  CreditCard,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QuoteData {
  referenceNumber: string;
  status: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalPrice: number;
  currency: string;
  validUntil: string | null;
  aiDescription: string | null;
  sentAt: string | null;
  bookingReference: string | null;
  supplierName: string;
  trip: {
    pickupLocation: string;
    dropoffLocation: string | null;
    departureDate: string;
    departureTime: string | null;
    returnDate: string | null;
    returnTime: string | null;
    passengerCount: number;
    vehicleType: string | null;
    enquiryReference: string;
  };
}

const formatCurrency = (amount: number, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount
  );

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));

const formatShortDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));

const vehicleTypeLabels: Record<string, string> = {
  MINIBUS: "Minibus",
  STANDARD_COACH: "Standard Coach",
  EXECUTIVE_COACH: "Executive Coach",
  DOUBLE_DECKER: "Double Decker",
  MIDI_COACH: "Midi Coach",
  OTHER: "Other",
};

interface QuoteViewProps {
  token: string;
  cancelled?: boolean;
}

export function QuoteView({ token, cancelled }: QuoteViewProps) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/quote/${token}`);

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load quote");
      }

      const data: QuoteData = await res.json();
      setQuote(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleAccept = async () => {
    try {
      setAccepting(true);

      const res = await fetch(`/api/quote/${token}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process payment");
      }

      const { checkoutUrl } = await res.json();

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);

      const res = await fetch(`/api/quote/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: declineReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to decline quote");
      }

      setDeclineDialogOpen(false);
      // Refresh quote to show declined state
      await fetchQuote();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setDeclining(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your quote...</p>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Quote Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            This quote link is invalid or has been removed. Please check the
            link and try again, or contact us for assistance.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !quote) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Something Went Wrong</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={fetchQuote} variant="outline" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  // Expired state
  if (quote.status === "EXPIRED") {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Timer className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-xl font-semibold">Quote Expired</h2>
          <p className="mt-2 text-muted-foreground">
            This quote ({quote.referenceNumber}) has expired and is no longer
            available. Please contact us if you would like a new quote.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Accepted state
  if (quote.status === "ACCEPTED") {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-semibold">Quote Accepted</h2>
          <p className="mt-2 text-muted-foreground">
            This quote has already been accepted and paid for.
          </p>
          {quote.bookingReference && (
            <p className="mt-3 text-sm">
              Booking Reference:{" "}
              <span className="font-semibold">{quote.bookingReference}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Rejected state
  if (quote.status === "REJECTED") {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Quote Declined</h2>
          <p className="mt-2 text-muted-foreground">
            This quote ({quote.referenceNumber}) has been declined. Please
            contact us if you would like to discuss further options.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Active quote (SENT_TO_CUSTOMER, DRAFT, MARKUP_APPLIED) - show full details
  const isActionable = quote.status === "SENT_TO_CUSTOMER";

  return (
    <div className="space-y-6">
      {/* Cancelled payment banner */}
      {cancelled && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <Info className="h-5 w-5 shrink-0" />
          <p>
            Payment was cancelled. You can try again by clicking the &quot;Accept
            &amp; Pay&quot; button below.
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Quote header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Your Quote</h1>
        <p className="mt-1 text-muted-foreground">
          Reference: {quote.referenceNumber}
        </p>
        {quote.sentAt && (
          <p className="text-sm text-muted-foreground">
            Sent on {formatDate(quote.sentAt)}
          </p>
        )}
      </div>

      {/* Trip summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bus className="h-5 w-5 text-primary" />
            Trip Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Pickup
                </p>
                <p className="text-sm font-medium">
                  {quote.trip.pickupLocation}
                </p>
              </div>
            </div>
            {quote.trip.dropoffLocation && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Drop-off
                  </p>
                  <p className="text-sm font-medium">
                    {quote.trip.dropoffLocation}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Departure
                </p>
                <p className="text-sm font-medium">
                  {formatShortDate(quote.trip.departureDate)}
                  {quote.trip.departureTime && ` at ${quote.trip.departureTime}`}
                </p>
              </div>
            </div>
            {quote.trip.returnDate && (
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Return
                  </p>
                  <p className="text-sm font-medium">
                    {formatShortDate(quote.trip.returnDate)}
                    {quote.trip.returnTime && ` at ${quote.trip.returnTime}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Passengers
                </p>
                <p className="text-sm font-medium">
                  {quote.trip.passengerCount}
                </p>
              </div>
            </div>
            {quote.trip.vehicleType && (
              <div className="flex items-start gap-3">
                <Bus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Vehicle Type
                  </p>
                  <p className="text-sm font-medium">
                    {vehicleTypeLabels[quote.trip.vehicleType] ??
                      quote.trip.vehicleType}
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Provided by {quote.supplierName}
          </p>
        </CardContent>
      </Card>

      {/* AI description */}
      {quote.aiDescription && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {quote.aiDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Price breakdown card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
            <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              VAT ({quote.vatRate}%)
            </span>
            <span>{formatCurrency(quote.vatAmount, quote.currency)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(quote.totalPrice, quote.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Valid until */}
      {quote.validUntil && isActionable && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            This quote is valid until {formatDate(quote.validUntil)}
          </span>
        </div>
      )}

      {/* Action buttons */}
      {isActionable && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="sm:min-w-[200px]"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Accept &amp; Pay
              </>
            )}
          </Button>

          <Dialog
            open={declineDialogOpen}
            onOpenChange={setDeclineDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                Decline Quote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Decline This Quote?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to decline this quote? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label
                  htmlFor="decline-reason"
                  className="mb-2 block text-sm font-medium"
                >
                  Reason for declining (optional)
                </label>
                <Textarea
                  id="decline-reason"
                  placeholder="Let us know why this quote doesn't work for you..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeclineDialogOpen(false)}
                  disabled={declining}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDecline}
                  disabled={declining}
                >
                  {declining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Declining...
                    </>
                  ) : (
                    "Confirm Decline"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Non-actionable status badge */}
      {!isActionable && (
        <div className="flex justify-center">
          <Badge variant="secondary">
            Status: {quote.status.replace(/_/g, " ")}
          </Badge>
        </div>
      )}
    </div>
  );
}
