"use client";

import { useState } from "react";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { step2Schema } from "@/lib/validations/enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Minus,
  Plus,
  Accessibility,
  Luggage,
  Users,
  Crown,
  Layers,
  Truck,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const vehicleTypes = [
  {
    value: "MINIBUS" as const,
    label: "Minibus",
    capacity: "Up to 16",
    icon: Bus,
  },
  {
    value: "MIDI_COACH" as const,
    label: "Midi Coach",
    capacity: "Up to 35",
    icon: Truck,
  },
  {
    value: "STANDARD_COACH" as const,
    label: "Standard Coach",
    capacity: "Up to 53",
    icon: Users,
  },
  {
    value: "EXECUTIVE_COACH" as const,
    label: "Executive Coach",
    capacity: "Up to 49",
    icon: Crown,
  },
  {
    value: "DOUBLE_DECKER" as const,
    label: "Double Decker",
    capacity: "Up to 80",
    icon: Layers,
  },
  {
    value: "OTHER" as const,
    label: "Other",
    capacity: "Custom",
    icon: HelpCircle,
  },
];

export function StepVehiclePreferences() {
  const { step2, updateStep2, setStep } = useEnquiryStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handlePassengerChange(delta: number) {
    const newCount = Math.max(1, (step2.passengerCount ?? 1) + delta);
    updateStep2({ passengerCount: newCount });
  }

  function handleBack() {
    setStep(1);
  }

  function handleNext() {
    const result = step2Schema.safeParse(step2);
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
    setStep(3);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Vehicle Preferences
        </h2>
        <p className="text-muted-foreground mt-1">
          Help us find the right vehicle for your group.
        </p>
      </div>

      {/* Passenger Count */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          <Users className="mr-1 inline-block h-4 w-4" />
          Number of Passengers
        </Label>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePassengerChange(-1)}
            disabled={(step2.passengerCount ?? 1) <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            max={500}
            value={step2.passengerCount ?? 1}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) {
                updateStep2({ passengerCount: val });
              }
            }}
            className={cn(
              "w-24 text-center text-lg font-semibold",
              errors.passengerCount && "border-destructive"
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePassengerChange(1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">passengers</span>
        </div>
        {errors.passengerCount && (
          <p className="text-sm text-destructive">{errors.passengerCount}</p>
        )}
      </div>

      {/* Vehicle Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Vehicle Type</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vehicleTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = step2.vehicleType === type.value;
            return (
              <Card
                key={type.value}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  isSelected &&
                    "border-primary bg-primary/5 ring-1 ring-primary"
                )}
                onClick={() => updateStep2({ vehicleType: type.value })}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <Icon
                    className={cn(
                      "h-7 w-7",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {type.capacity}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {errors.vehicleType && (
          <p className="text-sm text-destructive">{errors.vehicleType}</p>
        )}
      </div>

      {/* Accessibility & Luggage */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            step2.wheelchairAccessible &&
              "border-primary bg-primary/5 ring-1 ring-primary"
          )}
          onClick={() =>
            updateStep2({
              wheelchairAccessible: !step2.wheelchairAccessible,
            })
          }
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Accessibility
              className={cn(
                "h-6 w-6",
                step2.wheelchairAccessible
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            />
            <div className="flex-1">
              <p className="font-medium">Wheelchair Accessible</p>
              <p className="text-xs text-muted-foreground">
                Vehicle with wheelchair access required
              </p>
            </div>
            <div
              className={cn(
                "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                step2.wheelchairAccessible ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  step2.wheelchairAccessible && "translate-x-4"
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:border-primary/50",
            step2.luggageSpace &&
              "border-primary bg-primary/5 ring-1 ring-primary"
          )}
          onClick={() =>
            updateStep2({
              luggageSpace: !step2.luggageSpace,
            })
          }
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Luggage
              className={cn(
                "h-6 w-6",
                step2.luggageSpace
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            />
            <div className="flex-1">
              <p className="font-medium">Luggage Space</p>
              <p className="text-xs text-muted-foreground">
                Extra luggage storage needed
              </p>
            </div>
            <div
              className={cn(
                "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                step2.luggageSpace ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  step2.luggageSpace && "translate-x-4"
                )}
              />
            </div>
          </CardContent>
        </Card>
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
