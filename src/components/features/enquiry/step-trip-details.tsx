"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEnquiryStore } from "@/stores/enquiry-store";
import { step1Schema } from "@/lib/validations/enquiry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  ArrowLeftRight,
  Route,
  MapPin,
  Calendar,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function useAddressAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&countrycodes=gb&limit=5`
        );
        const data: NominatimResult[] = await response.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch {
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { query, setQuery, results, isLoading, isOpen, setIsOpen, search, clear };
}

const tripTypes = [
  {
    value: "ONE_WAY" as const,
    label: "One Way",
    description: "Single journey from A to B",
    icon: ArrowRight,
  },
  {
    value: "RETURN" as const,
    label: "Return",
    description: "Round trip with return journey",
    icon: ArrowLeftRight,
  },
  {
    value: "MULTI_STOP" as const,
    label: "Multi-Stop",
    description: "Multiple stops along the route",
    icon: Route,
  },
];

export function StepTripDetails() {
  const { step1, updateStep1, setStep } = useEnquiryStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickup = useAddressAutocomplete();
  const dropoff = useAddressAutocomplete();

  const pickupContainerRef = useRef<HTMLDivElement>(null);
  const dropoffContainerRef = useRef<HTMLDivElement>(null);

  // Sync autocomplete query fields with store data on mount
  useEffect(() => {
    if (step1.pickupLocation) {
      pickup.setQuery(step1.pickupLocation);
    }
    if (step1.dropoffLocation) {
      dropoff.setQuery(step1.dropoffLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickupContainerRef.current &&
        !pickupContainerRef.current.contains(event.target as Node)
      ) {
        pickup.setIsOpen(false);
      }
      if (
        dropoffContainerRef.current &&
        !dropoffContainerRef.current.contains(event.target as Node)
      ) {
        dropoff.setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showReturnFields =
    step1.tripType === "RETURN" || step1.tripType === "MULTI_STOP";

  const today = new Date().toISOString().split("T")[0];

  function handleSelectPickup(result: NominatimResult) {
    pickup.setQuery(result.display_name);
    pickup.setIsOpen(false);
    updateStep1({
      pickupLocation: result.display_name,
      pickupLat: parseFloat(result.lat),
      pickupLng: parseFloat(result.lon),
    });
  }

  function handleSelectDropoff(result: NominatimResult) {
    dropoff.setQuery(result.display_name);
    dropoff.setIsOpen(false);
    updateStep1({
      dropoffLocation: result.display_name,
      dropoffLat: parseFloat(result.lat),
      dropoffLng: parseFloat(result.lon),
    });
  }

  function handleNext() {
    const result = step1Schema.safeParse(step1);
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
    setStep(2);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Trip Details</h2>
        <p className="text-muted-foreground mt-1">
          Tell us about your journey so we can find the best options for you.
        </p>
      </div>

      {/* Trip Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Trip Type</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tripTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = step1.tripType === type.value;
            return (
              <Card
                key={type.value}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
                onClick={() => updateStep1({ tripType: type.value })}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <Icon
                    className={cn(
                      "h-8 w-8",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {errors.tripType && (
          <p className="text-sm text-destructive">{errors.tripType}</p>
        )}
      </div>

      {/* Pickup Location */}
      <div className="space-y-2" ref={pickupContainerRef}>
        <Label htmlFor="pickupLocation" className="text-base font-semibold">
          <MapPin className="mr-1 inline-block h-4 w-4" />
          Pickup Location
        </Label>
        <div className="relative">
          <Input
            id="pickupLocation"
            placeholder="Start typing an address..."
            value={pickup.query}
            onChange={(e) => {
              pickup.search(e.target.value);
              updateStep1({
                pickupLocation: e.target.value,
                pickupLat: undefined,
                pickupLng: undefined,
              });
            }}
            className={cn(errors.pickupLocation && "border-destructive")}
          />
          {pickup.isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {pickup.isOpen && pickup.results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-lg">
              {pickup.results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelectPickup(result)}
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.pickupLocation && (
          <p className="text-sm text-destructive">{errors.pickupLocation}</p>
        )}
      </div>

      {/* Dropoff Location */}
      <div className="space-y-2" ref={dropoffContainerRef}>
        <Label htmlFor="dropoffLocation" className="text-base font-semibold">
          <MapPin className="mr-1 inline-block h-4 w-4" />
          Dropoff Location
        </Label>
        <div className="relative">
          <Input
            id="dropoffLocation"
            placeholder="Start typing an address..."
            value={dropoff.query}
            onChange={(e) => {
              dropoff.search(e.target.value);
              updateStep1({
                dropoffLocation: e.target.value,
                dropoffLat: undefined,
                dropoffLng: undefined,
              });
            }}
            className={cn(errors.dropoffLocation && "border-destructive")}
          />
          {dropoff.isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {dropoff.isOpen && dropoff.results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-lg">
              {dropoff.results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelectDropoff(result)}
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.dropoffLocation && (
          <p className="text-sm text-destructive">{errors.dropoffLocation}</p>
        )}
      </div>

      {/* Departure Date & Time */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="departureDate" className="text-base font-semibold">
            <Calendar className="mr-1 inline-block h-4 w-4" />
            Departure Date
          </Label>
          <Input
            id="departureDate"
            type="date"
            min={today}
            value={step1.departureDate ?? ""}
            onChange={(e) => updateStep1({ departureDate: e.target.value })}
            className={cn(errors.departureDate && "border-destructive")}
          />
          {errors.departureDate && (
            <p className="text-sm text-destructive">{errors.departureDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="departureTime" className="text-base font-semibold">
            <Clock className="mr-1 inline-block h-4 w-4" />
            Departure Time
          </Label>
          <Input
            id="departureTime"
            type="time"
            value={step1.departureTime ?? ""}
            onChange={(e) => updateStep1({ departureTime: e.target.value })}
            className={cn(errors.departureTime && "border-destructive")}
          />
          {errors.departureTime && (
            <p className="text-sm text-destructive">{errors.departureTime}</p>
          )}
        </div>
      </div>

      {/* Return Date & Time (conditional) */}
      {showReturnFields && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="returnDate" className="text-base font-semibold">
              <Calendar className="mr-1 inline-block h-4 w-4" />
              Return Date
            </Label>
            <Input
              id="returnDate"
              type="date"
              min={step1.departureDate || today}
              value={step1.returnDate ?? ""}
              onChange={(e) => updateStep1({ returnDate: e.target.value })}
              className={cn(errors.returnDate && "border-destructive")}
            />
            {errors.returnDate && (
              <p className="text-sm text-destructive">{errors.returnDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnTime" className="text-base font-semibold">
              <Clock className="mr-1 inline-block h-4 w-4" />
              Return Time
            </Label>
            <Input
              id="returnTime"
              type="time"
              value={step1.returnTime ?? ""}
              onChange={(e) => updateStep1({ returnTime: e.target.value })}
              className={cn(errors.returnTime && "border-destructive")}
            />
            {errors.returnTime && (
              <p className="text-sm text-destructive">{errors.returnTime}</p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} size="lg">
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
