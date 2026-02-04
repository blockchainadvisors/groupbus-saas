"use client";

import { useState } from "react";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { step3Schema } from "@/lib/validations/enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Wifi,
  Bath,
  Usb,
  Wind,
  Megaphone,
  Tv,
  PoundSterling,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const amenityOptions = [
  { value: "WiFi", label: "WiFi", icon: Wifi },
  { value: "Toilet", label: "Toilet", icon: Bath },
  { value: "USB Charging", label: "USB Charging", icon: Usb },
  { value: "Air Conditioning", label: "Air Conditioning", icon: Wind },
  { value: "PA System", label: "PA System", icon: Megaphone },
  { value: "DVD/Entertainment", label: "DVD/Entertainment", icon: Tv },
];

const MAX_NOTES_LENGTH = 2000;

export function StepAdditionalInfo() {
  const { step3, updateStep3, setStep } = useEnquiryStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentRequirements = step3.specialRequirements ?? [];
  const notesLength = (step3.additionalNotes ?? "").length;

  function toggleRequirement(value: string) {
    const current = [...currentRequirements];
    const index = current.indexOf(value);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    updateStep3({ specialRequirements: current });
  }

  function handleBack() {
    setStep(2);
  }

  function handleNext() {
    const result = step3Schema.safeParse(step3);
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
    setStep(4);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Additional Information
        </h2>
        <p className="text-muted-foreground mt-1">
          Let us know about any special requirements or preferences.
        </p>
      </div>

      {/* Special Requirements */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Special Requirements</Label>
        <p className="text-sm text-muted-foreground">
          Select any amenities you need on board.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {amenityOptions.map((amenity) => {
            const Icon = amenity.icon;
            const isSelected = currentRequirements.includes(amenity.value);
            return (
              <button
                key={amenity.value}
                type="button"
                onClick={() => toggleRequirement(amenity.value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                  isSelected &&
                    "border-primary bg-primary/5 ring-1 ring-primary"
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && (
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
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="text-sm font-medium">{amenity.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget Range */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          <PoundSterling className="mr-1 inline-block h-4 w-4" />
          Budget Range (Optional)
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budgetMin" className="text-sm">
              Minimum
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                &pound;
              </span>
              <Input
                id="budgetMin"
                type="number"
                min={0}
                step={50}
                placeholder="0"
                value={step3.budgetMin ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseFloat(e.target.value)
                    : undefined;
                  updateStep3({ budgetMin: val });
                }}
                className={cn("pl-7", errors.budgetMin && "border-destructive")}
              />
            </div>
            {errors.budgetMin && (
              <p className="text-sm text-destructive">{errors.budgetMin}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetMax" className="text-sm">
              Maximum
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                &pound;
              </span>
              <Input
                id="budgetMax"
                type="number"
                min={0}
                step={50}
                placeholder="0"
                value={step3.budgetMax ?? ""}
                onChange={(e) => {
                  const val = e.target.value
                    ? parseFloat(e.target.value)
                    : undefined;
                  updateStep3({ budgetMax: val });
                }}
                className={cn("pl-7", errors.budgetMax && "border-destructive")}
              />
            </div>
            {errors.budgetMax && (
              <p className="text-sm text-destructive">{errors.budgetMax}</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="space-y-2">
        <Label htmlFor="additionalNotes" className="text-base font-semibold">
          <StickyNote className="mr-1 inline-block h-4 w-4" />
          Additional Notes
        </Label>
        <Textarea
          id="additionalNotes"
          placeholder="Any other details we should know about your trip..."
          rows={4}
          maxLength={MAX_NOTES_LENGTH}
          value={step3.additionalNotes ?? ""}
          onChange={(e) =>
            updateStep3({ additionalNotes: e.target.value })
          }
          className={cn(errors.additionalNotes && "border-destructive")}
        />
        <div className="flex justify-between">
          {errors.additionalNotes ? (
            <p className="text-sm text-destructive">
              {errors.additionalNotes}
            </p>
          ) : (
            <span />
          )}
          <p
            className={cn(
              "text-xs text-muted-foreground",
              notesLength > MAX_NOTES_LENGTH && "text-destructive"
            )}
          >
            {notesLength}/{MAX_NOTES_LENGTH}
          </p>
        </div>
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
