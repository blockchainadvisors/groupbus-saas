"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Calendar,
  Users,
  Bus,
  ArrowRight,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  MessageSquare,
  FileText,
  Building,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

const statusLabels: Record<string, string> = {
  SUPPLIER_ASSIGNED: "Awaiting Your Response",
  SUPPLIER_ACCEPTED: "Accepted",
  SUPPLIER_REJECTED: "Rejected",
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

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookingData {
  id: string;
  referenceNumber: string;
  status: string;
  enquiry: {
    referenceNumber: string;
    contactName: string;
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
  };
  organisation: {
    name: string;
  };
  vehicle: {
    registrationNumber: string;
    type: string;
    capacity: number;
    features: string[];
  } | null;
  driver: {
    firstName: string;
    lastName: string;
    phone: string | null;
    licenseNumber: string | null;
  } | null;
  driverName: string | null;
  driverPhone: string | null;
}

type PageState = "loading" | "error" | "already-responded" | "form" | "success";
type ResponseAction = "accept" | "reject" | null;

interface BookingResponseFormProps {
  token: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BookingResponseForm({ token }: BookingResponseFormProps) {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [booking, setBooking] = useState<BookingData | null>(null);

  // Form state
  const [selectedAction, setSelectedAction] = useState<ResponseAction>(null);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [responseStatus, setResponseStatus] = useState<"accepted" | "rejected" | null>(null);

  // -------------------------------------------------------------------------
  // Fetch booking data on mount
  // -------------------------------------------------------------------------

  const loadBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/by-token/${token}`);

      if (res.status === 404) {
        setErrorMessage("This booking could not be found. Please check the link and try again.");
        setPageState("error");
        return;
      }

      if (!res.ok) {
        setErrorMessage("Something went wrong. Please try again later.");
        setPageState("error");
        return;
      }

      const data = await res.json();

      // Check if already responded
      if (data.status === "SUPPLIER_ACCEPTED" || data.status === "SUPPLIER_REJECTED") {
        setBooking(data);
        setPageState("already-responded");
        return;
      }

      // Check if status allows response
      if (data.status !== "SUPPLIER_ASSIGNED") {
        setErrorMessage(`This booking cannot accept responses in its current state (${data.status}).`);
        setPageState("error");
        return;
      }

      setBooking(data);
      setPageState("form");
    } catch {
      setErrorMessage("Unable to connect. Please check your internet connection and try again.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // -------------------------------------------------------------------------
  // Form validation
  // -------------------------------------------------------------------------

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!selectedAction) {
      errors._form = "Please select whether to accept or reject the booking.";
      setFormErrors(errors);
      return false;
    }

    if (selectedAction === "accept") {
      if (!driverName.trim()) {
        errors.driverName = "Driver name is required when accepting a booking";
      }
    }

    if (rejectReason.length > 1000) {
      errors.rejectReason = "Reason must be 1000 characters or fewer";
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
        action: selectedAction,
      };

      if (selectedAction === "accept") {
        payload.driverName = driverName.trim();
        if (driverPhone.trim()) {
          payload.driverPhone = driverPhone.trim();
        }
      } else if (selectedAction === "reject" && rejectReason.trim()) {
        payload.reason = rejectReason.trim();
      }

      const res = await fetch(`/api/bookings/by-token/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        setErrorMessage("Booking not found.");
        setPageState("error");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormErrors({
          _form: data?.error || "Something went wrong. Please try again.",
        });
        return;
      }

      setResponseStatus(selectedAction === "accept" ? "accepted" : "rejected");
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
        <p className="mt-4 text-sm text-muted-foreground">Loading booking details...</p>
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
  // Render: Already Responded
  // -------------------------------------------------------------------------

  if (pageState === "already-responded" && booking) {
    const isAccepted = booking.status === "SUPPLIER_ACCEPTED";
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            {isAccepted ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
            <h2 className="mt-4 text-lg font-semibold">
              Booking {isAccepted ? "Accepted" : "Rejected"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              You have already {isAccepted ? "accepted" : "rejected"} this booking assignment.
              {isAccepted && booking.driverName && (
                <span className="block mt-2">
                  Driver assigned: <strong>{booking.driverName}</strong>
                  {booking.driverPhone && ` (${booking.driverPhone})`}
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <BookingSummaryCard booking={booking} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Success
  // -------------------------------------------------------------------------

  if (pageState === "success") {
    const isAccepted = responseStatus === "accepted";
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            {isAccepted ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-amber-500" />
            )}
            <h2 className="mt-4 text-lg font-semibold">
              {isAccepted ? "Booking Accepted" : "Booking Rejected"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              {isAccepted ? (
                <>
                  Thank you for accepting this booking. The GroupBus team has been notified
                  and will be in touch with further details.
                  <span className="block mt-2">
                    Driver: <strong>{driverName}</strong>
                    {driverPhone && ` (${driverPhone})`}
                  </span>
                </>
              ) : (
                "You have rejected this booking. The GroupBus team has been notified and will reassign to another supplier."
              )}
            </p>
          </CardContent>
        </Card>
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
        <h1 className="text-2xl font-bold">Booking Assignment</h1>
        <p className="mt-2 text-muted-foreground">
          Review the booking details and respond below.
        </p>
      </div>

      {/* Booking Summary */}
      {booking && <BookingSummaryCard booking={booking} />}

      {/* Response Form */}
      <Card>
        <CardHeader>
          <CardTitle>Your Response</CardTitle>
          <CardDescription>
            Accept or reject this booking assignment. If accepting, please provide driver details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form-level error */}
            {formErrors._form && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formErrors._form}
              </div>
            )}

            {/* Action Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedAction("accept")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedAction === "accept"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-border hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    selectedAction === "accept"
                      ? "bg-emerald-500 text-white"
                      : "bg-muted"
                  }`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Accept Booking</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm you can fulfil this trip
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("reject")}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedAction === "reject"
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-destructive/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    selectedAction === "reject"
                      ? "bg-destructive text-white"
                      : "bg-muted"
                  }`}>
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Reject Booking</p>
                    <p className="text-xs text-muted-foreground">
                      Unable to fulfil this trip
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Accept Fields */}
            {selectedAction === "accept" && (
              <div className="space-y-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Driver Details
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="driverName">
                    Driver Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="driverName"
                    type="text"
                    placeholder="Enter the driver's full name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    aria-invalid={!!formErrors.driverName}
                  />
                  {formErrors.driverName && (
                    <p className="text-sm text-destructive">{formErrors.driverName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverPhone">Driver Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="driverPhone"
                      type="tel"
                      placeholder="Driver's contact number (optional)"
                      className="pl-10"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Providing a contact number helps with on-the-day coordination.
                  </p>
                </div>
              </div>
            )}

            {/* Reject Fields */}
            {selectedAction === "reject" && (
              <div className="space-y-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <h3 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Reason for Rejection
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="rejectReason">Reason (optional)</Label>
                  <Textarea
                    id="rejectReason"
                    placeholder="Let us know why you're unable to accept this booking..."
                    rows={3}
                    maxLength={1000}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    aria-invalid={!!formErrors.rejectReason}
                  />
                  <div className="flex items-center justify-between">
                    {formErrors.rejectReason ? (
                      <p className="text-sm text-destructive">{formErrors.rejectReason}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {rejectReason.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            {selectedAction && (
              <Button
                type="submit"
                size="lg"
                className="w-full"
                variant={selectedAction === "accept" ? "default" : "destructive"}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : selectedAction === "accept" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept Booking
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Reject Booking
                  </>
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Booking Summary Card (read-only)
// ---------------------------------------------------------------------------

function BookingSummaryCard({ booking }: { booking: BookingData }) {
  const enquiry = booking.enquiry;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Booking Details
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{booking.referenceNumber}</Badge>
            <Badge
              variant={
                booking.status === "SUPPLIER_ASSIGNED"
                  ? "warning"
                  : booking.status === "SUPPLIER_ACCEPTED"
                  ? "success"
                  : "destructive"
              }
            >
              {statusLabels[booking.status] || booking.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Organisation */}
        <div className="flex items-start gap-3">
          <Building className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Assigned by</p>
            <p className="text-sm font-medium">{booking.organisation.name}</p>
          </div>
        </div>

        {/* Trip Type */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {tripTypeLabels[enquiry.tripType] || enquiry.tripType}
          </Badge>
          {enquiry.vehicleType && (
            <Badge variant="outline">
              {vehicleTypeLabels[enquiry.vehicleType] || enquiry.vehicleType}
            </Badge>
          )}
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
          {booking.vehicle && (
            <div className="flex items-start gap-3">
              <Bus className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle Assigned</p>
                <p className="text-sm font-medium">
                  {booking.vehicle.registrationNumber} ({booking.vehicle.capacity} seats)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Special Requirements */}
        {enquiry.specialRequirements && enquiry.specialRequirements.length > 0 && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Special Requirements</p>
              <ul className="mt-1 space-y-1">
                {enquiry.specialRequirements.map((req, i) => (
                  <li key={i} className="text-sm">{req}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {enquiry.additionalNotes && (
          <div className="flex items-start gap-3">
            <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
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
