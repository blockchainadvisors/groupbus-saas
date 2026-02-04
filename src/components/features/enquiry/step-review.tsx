"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Edit,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Bus,
  Accessibility,
  Luggage,
  Sparkles,
  PoundSterling,
  StickyNote,
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Send,
  AlertCircle,
} from "lucide-react";
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

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Not specified";
  try {
    const date = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export function StepReview() {
  const router = useRouter();
  const { step1, step2, step3, step4, setStep, reset } =
    useEnquiryStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleBack() {
    setStep(4);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        // Step 1 - Trip Details
        tripType: step1.tripType,
        pickupLocation: step1.pickupLocation,
        pickupLat: step1.pickupLat,
        pickupLng: step1.pickupLng,
        dropoffLocation: step1.dropoffLocation,
        dropoffLat: step1.dropoffLat,
        dropoffLng: step1.dropoffLng,
        departureDate: step1.departureDate,
        departureTime: step1.departureTime,
        returnDate: step1.returnDate,
        returnTime: step1.returnTime,

        // Step 2 - Vehicle Preferences
        passengerCount: step2.passengerCount,
        vehicleType: step2.vehicleType,
        wheelchairAccessible: step2.wheelchairAccessible,
        luggageSpace: step2.luggageSpace,

        // Step 3 - Additional Info
        specialRequirements: step3.specialRequirements,
        budgetMin: step3.budgetMin,
        budgetMax: step3.budgetMax,
        additionalNotes: step3.additionalNotes,

        // Step 4 - Contact Details
        contactName: step4.contactName,
        contactEmail: step4.contactEmail,
        contactPhone: step4.contactPhone,
        companyName: step4.companyName,
        gdprConsent: step4.gdprConsent,
      };

      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || data?.message || "Failed to submit enquiry"
        );
      }

      const data = await response.json();
      const referenceNumber = data.data?.referenceNumber ?? data.referenceNumber;

      reset();
      router.push(`/enquiry/confirmation?ref=${referenceNumber}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const showReturnInfo =
    step1.tripType === "RETURN" || step1.tripType === "MULTI_STOP";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Review Your Enquiry
        </h2>
        <p className="text-muted-foreground mt-1">
          Please check all details before submitting your enquiry.
        </p>
      </div>

      {/* Trip Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Trip Details</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          <SummaryRow
            icon={Bus}
            label="Trip Type"
            value={step1.tripType ? (tripTypeLabels[step1.tripType] ?? step1.tripType) : "Not specified"}
          />
          <SummaryRow
            icon={MapPin}
            label="Pickup Location"
            value={step1.pickupLocation || "Not specified"}
          />
          <SummaryRow
            icon={MapPin}
            label="Dropoff Location"
            value={step1.dropoffLocation || "Not specified"}
          />
          <SummaryRow
            icon={Calendar}
            label="Departure Date"
            value={formatDate(step1.departureDate)}
          />
          <SummaryRow
            icon={Clock}
            label="Departure Time"
            value={step1.departureTime || "Not specified"}
          />
          {showReturnInfo && (
            <>
              <SummaryRow
                icon={Calendar}
                label="Return Date"
                value={formatDate(step1.returnDate)}
              />
              <SummaryRow
                icon={Clock}
                label="Return Time"
                value={step1.returnTime || "Not specified"}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Preferences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Vehicle Preferences</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(2)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          <SummaryRow
            icon={Users}
            label="Passengers"
            value={String(step2.passengerCount ?? "Not specified")}
          />
          <SummaryRow
            icon={Bus}
            label="Vehicle Type"
            value={
              step2.vehicleType
                ? vehicleTypeLabels[step2.vehicleType] ?? step2.vehicleType
                : "Not specified"
            }
          />
          <SummaryRow
            icon={Accessibility}
            label="Wheelchair Accessible"
            value={step2.wheelchairAccessible ? "Yes" : "No"}
          />
          <SummaryRow
            icon={Luggage}
            label="Luggage Space Required"
            value={step2.luggageSpace ? "Yes" : "No"}
          />
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Additional Information</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(3)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          <SummaryRow
            icon={Sparkles}
            label="Special Requirements"
            value={
              step3.specialRequirements &&
              step3.specialRequirements.length > 0
                ? step3.specialRequirements.join(", ")
                : "None"
            }
          />
          <SummaryRow
            icon={PoundSterling}
            label="Budget Range"
            value={
              step3.budgetMin != null || step3.budgetMax != null
                ? `${step3.budgetMin != null ? `\u00A3${step3.budgetMin}` : "No min"} - ${step3.budgetMax != null ? `\u00A3${step3.budgetMax}` : "No max"}`
                : "Not specified"
            }
          />
          <SummaryRow
            icon={StickyNote}
            label="Additional Notes"
            value={step3.additionalNotes || "None"}
          />
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Contact Details</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(4)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          <SummaryRow
            icon={User}
            label="Full Name"
            value={step4.contactName || "Not specified"}
          />
          <SummaryRow
            icon={Mail}
            label="Email"
            value={step4.contactEmail || "Not specified"}
          />
          <SummaryRow
            icon={Phone}
            label="Phone"
            value={step4.contactPhone || "Not specified"}
          />
          {step4.companyName && (
            <SummaryRow
              icon={Building2}
              label="Company"
              value={step4.companyName}
            />
          )}
          <SummaryRow
            icon={ShieldCheck}
            label="GDPR Consent"
            value={step4.gdprConsent ? "Agreed" : "Not agreed"}
          />
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              Submission Failed
            </p>
            <p className="mt-1 text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSubmit} size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Enquiry
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
