"use client";

import { useState } from "react";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { step4Schema } from "@/lib/validations/enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StepContactDetails() {
  const { step4, updateStep4, setStep } = useEnquiryStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleBack() {
    setStep(3);
  }

  function handleNext() {
    const result = step4Schema.safeParse(step4);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStep(5);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Contact Details</h2>
        <p className="text-muted-foreground mt-1">
          We need your contact information to send you quotes.
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="contactName" className="text-base font-semibold">
          <User className="mr-1 inline-block h-4 w-4" />
          Full Name
        </Label>
        <Input
          id="contactName"
          placeholder="John Smith"
          value={step4.contactName ?? ""}
          onChange={(e) => updateStep4({ contactName: e.target.value })}
          className={cn(errors.contactName && "border-destructive")}
        />
        {errors.contactName && (
          <p className="text-sm text-destructive">{errors.contactName}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="contactEmail" className="text-base font-semibold">
          <Mail className="mr-1 inline-block h-4 w-4" />
          Email Address
        </Label>
        <Input
          id="contactEmail"
          type="email"
          placeholder="john@example.com"
          value={step4.contactEmail ?? ""}
          onChange={(e) => updateStep4({ contactEmail: e.target.value })}
          className={cn(errors.contactEmail && "border-destructive")}
        />
        {errors.contactEmail && (
          <p className="text-sm text-destructive">{errors.contactEmail}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="contactPhone" className="text-base font-semibold">
          <Phone className="mr-1 inline-block h-4 w-4" />
          Phone Number
        </Label>
        <Input
          id="contactPhone"
          type="tel"
          placeholder="07700 900000"
          value={step4.contactPhone ?? ""}
          onChange={(e) => updateStep4({ contactPhone: e.target.value })}
          className={cn(errors.contactPhone && "border-destructive")}
        />
        {errors.contactPhone && (
          <p className="text-sm text-destructive">{errors.contactPhone}</p>
        )}
      </div>

      {/* Company Name (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="companyName" className="text-base font-semibold">
          <Building2 className="mr-1 inline-block h-4 w-4" />
          Company Name
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            (Optional)
          </span>
        </Label>
        <Input
          id="companyName"
          placeholder="Acme Ltd"
          value={step4.companyName ?? ""}
          onChange={(e) => updateStep4({ companyName: e.target.value })}
        />
      </div>

      {/* GDPR Consent */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() =>
            updateStep4({ gdprConsent: !step4.gdprConsent })
          }
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary/50",
            step4.gdprConsent &&
              "border-primary bg-primary/5 ring-1 ring-primary",
            errors.gdprConsent && "border-destructive"
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
              step4.gdprConsent
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30"
            )}
          >
            {step4.gdprConsent && (
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={cn(
                  "h-4 w-4",
                  step4.gdprConsent
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
              <span className="text-sm font-medium">Data Processing Consent</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              I agree to GroupBus processing my data to provide quotes and manage
              my booking.
            </p>
          </div>
        </button>
        {errors.gdprConsent && (
          <p className="text-sm text-destructive">{errors.gdprConsent}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button onClick={handleBack} variant="outline" size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
