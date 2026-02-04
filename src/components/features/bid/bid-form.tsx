"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Calendar,
  Users,
  Bus,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PoundSterling,
  Send,
  FileText,
  Accessibility,
  Luggage,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Label mappings
// ---------------------------------------------------------------------------

const tripTypeLabels: Record<string, string> = {
  ONE_WAY: "One Way",
  RETURN: "Return",
  MULTI_STOP: "Multi-Stop",
};

const vehicleTypeLabels: Record<string, string> = {
  MINIBUS: "Minibus",
  STANDARD_COACH: "Standard Coach",
  EXECUTIVE_COACH: "Executive Coach",
  DOUBLE_DECKER: "Double Decker",
  MIDI_COACH: "Midi Coach",
  OTHER: "Other",
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

function formatPrice(value: number): string {
  return currencyFormatter.format(value);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnquirySummary {
  referenceNumber: string;
  tripType: string;
  pickupLocation: string;
  dropoffLocation: string | null;
  departureDate: string;
  departureTime: string | null;
  returnDate: string | null;
  returnTime: string | null;
  passengerCount: number;
  vehicleType: string | null;
  specialRequirements: string[];
  additionalNotes: string | null;
  contactName: string;
}

interface QuoteData {
  basePrice: number;
  fuelSurcharge: number;
  tollCharges: number;
  parkingCharges: number;
  otherCharges: number;
  totalPrice: number;
  currency: string;
  vehicleOffered: string | null;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
}

type PageState = "loading" | "error" | "expired" | "already-submitted" | "form" | "success";

interface BidFormProps {
  token: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BidForm({ token }: BidFormProps) {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [enquiry, setEnquiry] = useState<EnquirySummary | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [existingQuote, setExistingQuote] = useState<QuoteData | null>(null);

  // Form fields
  const [basePrice, setBasePrice] = useState("");
  const [fuelSurcharge, setFuelSurcharge] = useState("");
  const [tollCharges, setTollCharges] = useState("");
  const [parkingCharges, setParkingCharges] = useState("");
  const [otherCharges, setOtherCharges] = useState("");
  const [vehicleOffered, setVehicleOffered] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittedQuote, setSubmittedQuote] = useState<QuoteData | null>(null);

  // Computed total
  const parsedBase = parseFloat(basePrice) || 0;
  const parsedFuel = parseFloat(fuelSurcharge) || 0;
  const parsedToll = parseFloat(tollCharges) || 0;
  const parsedParking = parseFloat(parkingCharges) || 0;
  const parsedOther = parseFloat(otherCharges) || 0;
  const totalPrice = parsedBase + parsedFuel + parsedToll + parsedParking + parsedOther;

  // -------------------------------------------------------------------------
  // Fetch enquiry data on mount
  // -------------------------------------------------------------------------

  const loadEnquiry = useCallback(async () => {
    try {
      const res = await fetch(`/api/bid/${token}`);

      if (res.status === 404) {
        setErrorMessage("This bid request could not be found. Please check the link and try again.");
        setPageState("error");
        return;
      }

      if (res.status === 410) {
        setPageState("expired");
        return;
      }

      if (!res.ok) {
        setErrorMessage("Something went wrong. Please try again later.");
        setPageState("error");
        return;
      }

      const data = await res.json();

      if (data.status === "already_submitted") {
        setExistingQuote(data.quote);
        setPageState("already-submitted");
        return;
      }

      setEnquiry(data.enquiry);
      setSupplierName(data.supplierName);
      setPageState("form");
    } catch {
      setErrorMessage("Unable to connect. Please check your internet connection and try again.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => {
    loadEnquiry();
  }, [loadEnquiry]);

  // -------------------------------------------------------------------------
  // Form validation
  // -------------------------------------------------------------------------

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!basePrice || parsedBase < 1) {
      errors.basePrice = "Base price is required and must be at least \u00a31.00";
    }

    if (fuelSurcharge && parsedFuel < 0) {
      errors.fuelSurcharge = "Fuel surcharge cannot be negative";
    }

    if (tollCharges && parsedToll < 0) {
      errors.tollCharges = "Toll charges cannot be negative";
    }

    if (parkingCharges && parsedParking < 0) {
      errors.parkingCharges = "Parking charges cannot be negative";
    }

    if (otherCharges && parsedOther < 0) {
      errors.otherCharges = "Other charges cannot be negative";
    }

    if (notes.length > 2000) {
      errors.notes = "Notes must be 2000 characters or fewer";
    }

    if (validUntil) {
      const date = new Date(validUntil);
      if (isNaN(date.getTime())) {
        errors.validUntil = "Please enter a valid date";
      } else if (date < new Date()) {
        errors.validUntil = "Valid until date must be in the future";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // -------------------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      const payload: Record<string, unknown> = {
        basePrice: parsedBase,
      };

      if (parsedFuel > 0) payload.fuelSurcharge = parsedFuel;
      if (parsedToll > 0) payload.tollCharges = parsedToll;
      if (parsedParking > 0) payload.parkingCharges = parsedParking;
      if (parsedOther > 0) payload.otherCharges = parsedOther;
      if (vehicleOffered.trim()) payload.vehicleOffered = vehicleOffered.trim();
      if (notes.trim()) payload.notes = notes.trim();
      if (validUntil) payload.validUntil = new Date(validUntil).toISOString();

      const res = await fetch(`/api/bid/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setExistingQuote(null);
        setPageState("already-submitted");
        return;
      }

      if (res.status === 410) {
        setPageState("expired");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of data.issues) {
            const field = issue.path?.[0];
            if (field) fieldErrors[String(field)] = issue.message;
          }
          setFormErrors(fieldErrors);
        } else {
          setFormErrors({
            _form: data?.error || "Something went wrong. Please try again.",
          });
        }
        return;
      }

      const data = await res.json();
      setSubmittedQuote(data.quote);
      setPageState("success");
    } catch {
      setFormErrors({
        _form: "Unable to submit. Please check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render: Loading
  // -------------------------------------------------------------------------

  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading bid request...</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Error
  // -------------------------------------------------------------------------

  if (pageState === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <XCircle className="h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Unable to Load</h2>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            {errorMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Expired
  // -------------------------------------------------------------------------

  if (pageState === "expired") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-lg font-semibold">Bid Request Expired</h2>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
            This bid request has expired and is no longer accepting submissions.
            If you believe this is an error, please contact us.
          </p>
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Already Submitted
  // -------------------------------------------------------------------------

  if (pageState === "already-submitted") {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 text-lg font-semibold">Bid Already Submitted</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              You have already submitted a bid for this enquiry. Your submission details are shown below.
            </p>
          </CardContent>
        </Card>

        {existingQuote && <QuoteSummaryCard quote={existingQuote} />}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Success
  // -------------------------------------------------------------------------

  if (pageState === "success") {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 text-lg font-semibold">Bid Submitted Successfully</h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              Thank you for your bid. We will review all submissions and get back to you shortly.
            </p>
          </CardContent>
        </Card>

        {submittedQuote && <QuoteSummaryCard quote={submittedQuote} />}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Form
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Submit Your Bid</h1>
        <p className="mt-2 text-muted-foreground">
          {supplierName ? `Bidding as ${supplierName}` : "Review the trip details and submit your bid below."}
        </p>
      </div>

      {/* Enquiry Summary */}
      {enquiry && <EnquirySummaryCard enquiry={enquiry} />}

      {/* Bid Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5" />
            Your Bid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form-level error */}
            {formErrors._form && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formErrors._form}
              </div>
            )}

            {/* Base Price */}
            <div className="space-y-2">
              <Label htmlFor="basePrice">
                Base Price <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  &pound;
                </span>
                <Input
                  id="basePrice"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  aria-invalid={!!formErrors.basePrice}
                />
              </div>
              {formErrors.basePrice && (
                <p className="text-sm text-destructive">{formErrors.basePrice}</p>
              )}
            </div>

            {/* Additional Charges Toggle */}
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdditionalCharges(!showAdditionalCharges)}
              >
                {showAdditionalCharges ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Additional Charges
              </button>

              {showAdditionalCharges && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fuel Surcharge */}
                  <div className="space-y-2">
                    <Label htmlFor="fuelSurcharge">Fuel Surcharge</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        &pound;
                      </span>
                      <Input
                        id="fuelSurcharge"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={fuelSurcharge}
                        onChange={(e) => setFuelSurcharge(e.target.value)}
                        aria-invalid={!!formErrors.fuelSurcharge}
                      />
                    </div>
                    {formErrors.fuelSurcharge && (
                      <p className="text-sm text-destructive">{formErrors.fuelSurcharge}</p>
                    )}
                  </div>

                  {/* Toll Charges */}
                  <div className="space-y-2">
                    <Label htmlFor="tollCharges">Toll Charges</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        &pound;
                      </span>
                      <Input
                        id="tollCharges"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={tollCharges}
                        onChange={(e) => setTollCharges(e.target.value)}
                        aria-invalid={!!formErrors.tollCharges}
                      />
                    </div>
                    {formErrors.tollCharges && (
                      <p className="text-sm text-destructive">{formErrors.tollCharges}</p>
                    )}
                  </div>

                  {/* Parking Charges */}
                  <div className="space-y-2">
                    <Label htmlFor="parkingCharges">Parking Charges</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        &pound;
                      </span>
                      <Input
                        id="parkingCharges"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={parkingCharges}
                        onChange={(e) => setParkingCharges(e.target.value)}
                        aria-invalid={!!formErrors.parkingCharges}
                      />
                    </div>
                    {formErrors.parkingCharges && (
                      <p className="text-sm text-destructive">{formErrors.parkingCharges}</p>
                    )}
                  </div>

                  {/* Other Charges */}
                  <div className="space-y-2">
                    <Label htmlFor="otherCharges">Other Charges</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        &pound;
                      </span>
                      <Input
                        id="otherCharges"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        value={otherCharges}
                        onChange={(e) => setOtherCharges(e.target.value)}
                        aria-invalid={!!formErrors.otherCharges}
                      />
                    </div>
                    {formErrors.otherCharges && (
                      <p className="text-sm text-destructive">{formErrors.otherCharges}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Total Price */}
            <div className="rounded-lg bg-muted/50 border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Price</span>
                <span className="text-2xl font-bold">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            {/* Vehicle Offered */}
            <div className="space-y-2">
              <Label htmlFor="vehicleOffered">Vehicle Offered</Label>
              <Input
                id="vehicleOffered"
                type="text"
                placeholder="e.g. 49-seat Volvo Executive Coach"
                value={vehicleOffered}
                onChange={(e) => setVehicleOffered(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Describe the vehicle you intend to provide for this trip.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about your bid..."
                rows={4}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                aria-invalid={!!formErrors.notes}
              />
              <div className="flex items-center justify-between">
                {formErrors.notes ? (
                  <p className="text-sm text-destructive">{formErrors.notes}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">
                  {notes.length}/2000
                </span>
              </div>
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Bid Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                aria-invalid={!!formErrors.validUntil}
              />
              {formErrors.validUntil && (
                <p className="text-sm text-destructive">{formErrors.validUntil}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional. The date until which this bid remains valid.
              </p>
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Bid
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enquiry Summary Card (read-only)
// ---------------------------------------------------------------------------

function EnquirySummaryCard({ enquiry }: { enquiry: EnquirySummary }) {
  const hasWheelchair = enquiry.specialRequirements.some(
    (r) => r.toLowerCase().includes("wheelchair")
  );
  const hasLuggage = enquiry.specialRequirements.some(
    (r) => r.toLowerCase().includes("luggage")
  );
  const otherRequirements = enquiry.specialRequirements.filter(
    (r) =>
      !r.toLowerCase().includes("wheelchair") &&
      !r.toLowerCase().includes("luggage")
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Trip Details
          </CardTitle>
          <Badge variant="outline">{enquiry.referenceNumber}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trip Type */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {tripTypeLabels[enquiry.tripType] || enquiry.tripType}
          </Badge>
        </div>

        {/* Route */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium">{enquiry.pickupLocation}</p>
            </div>
          </div>
          {enquiry.dropoffLocation && (
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Drop-off</p>
                <p className="text-sm font-medium">{enquiry.dropoffLocation}</p>
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Departure</p>
              <p className="text-sm font-medium">{formatDate(enquiry.departureDate)}</p>
              {enquiry.departureTime && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {enquiry.departureTime}
                </p>
              )}
            </div>
          </div>
          {enquiry.returnDate && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Return</p>
                <p className="text-sm font-medium">{formatDate(enquiry.returnDate)}</p>
                {enquiry.returnTime && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {enquiry.returnTime}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Passengers & Vehicle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Passengers</p>
              <p className="text-sm font-medium">{enquiry.passengerCount}</p>
            </div>
          </div>
          {enquiry.vehicleType && (
            <div className="flex items-start gap-3">
              <Bus className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle Type</p>
                <p className="text-sm font-medium">
                  {vehicleTypeLabels[enquiry.vehicleType] || enquiry.vehicleType}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Accessibility / Luggage badges */}
        {(hasWheelchair || hasLuggage) && (
          <div className="flex flex-wrap gap-2">
            {hasWheelchair && (
              <Badge variant="info" className="flex items-center gap-1">
                <Accessibility className="h-3 w-3" />
                Wheelchair Accessible
              </Badge>
            )}
            {hasLuggage && (
              <Badge variant="info" className="flex items-center gap-1">
                <Luggage className="h-3 w-3" />
                Luggage Space Required
              </Badge>
            )}
          </div>
        )}

        {/* Other special requirements */}
        {otherRequirements.length > 0 && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Special Requirements</p>
              <ul className="mt-1 space-y-1">
                {otherRequirements.map((req, i) => (
                  <li key={i} className="text-sm">{req}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {enquiry.additionalNotes && (
          <div className="flex items-start gap-3">
            <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Additional Notes</p>
              <p className="text-sm mt-1 whitespace-pre-line">{enquiry.additionalNotes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Quote Summary Card (read-only, for submitted/success states)
// ---------------------------------------------------------------------------

function QuoteSummaryCard({ quote }: { quote: QuoteData }) {
  const hasAdditionalCharges =
    quote.fuelSurcharge > 0 ||
    quote.tollCharges > 0 ||
    quote.parkingCharges > 0 ||
    quote.otherCharges > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PoundSterling className="h-5 w-5" />
          Bid Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Price</span>
            <span className="font-medium">{formatPrice(quote.basePrice)}</span>
          </div>
          {hasAdditionalCharges && (
            <>
              {quote.fuelSurcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fuel Surcharge</span>
                  <span>{formatPrice(quote.fuelSurcharge)}</span>
                </div>
              )}
              {quote.tollCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toll Charges</span>
                  <span>{formatPrice(quote.tollCharges)}</span>
                </div>
              )}
              {quote.parkingCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parking Charges</span>
                  <span>{formatPrice(quote.parkingCharges)}</span>
                </div>
              )}
              {quote.otherCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Other Charges</span>
                  <span>{formatPrice(quote.otherCharges)}</span>
                </div>
              )}
              <div className="border-t pt-2" />
            </>
          )}
          <div className="flex justify-between">
            <span className="font-medium">Total</span>
            <span className="text-lg font-bold">{formatPrice(quote.totalPrice)}</span>
          </div>
        </div>

        {/* Vehicle offered */}
        {quote.vehicleOffered && (
          <div>
            <p className="text-xs text-muted-foreground">Vehicle Offered</p>
            <p className="text-sm font-medium mt-0.5">{quote.vehicleOffered}</p>
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div>
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm mt-0.5 whitespace-pre-line">{quote.notes}</p>
          </div>
        )}

        {/* Valid Until */}
        {quote.validUntil && (
          <div>
            <p className="text-xs text-muted-foreground">Valid Until</p>
            <p className="text-sm font-medium mt-0.5">{formatDate(quote.validUntil)}</p>
          </div>
        )}

        {/* Submitted At */}
        {quote.createdAt && (
          <div>
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-sm font-medium mt-0.5">{formatDate(quote.createdAt)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
