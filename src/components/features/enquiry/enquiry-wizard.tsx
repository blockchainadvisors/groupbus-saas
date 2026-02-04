"use client";

import { useEnquiryStore } from "@/stores/enquiry-store";
import { StepIndicator } from "./step-indicator";
import { StepTripDetails } from "./step-trip-details";
import { StepVehiclePreferences } from "./step-vehicle-preferences";
import { StepAdditionalInfo } from "./step-additional-info";
import { StepContactDetails } from "./step-contact-details";
import { StepReview } from "./step-review";

export function EnquiryWizard() {
  const currentStep = useEnquiryStore((s) => s.currentStep);

  return (
    <div>
      <StepIndicator currentStep={currentStep} />
      {currentStep === 1 && <StepTripDetails />}
      {currentStep === 2 && <StepVehiclePreferences />}
      {currentStep === 3 && <StepAdditionalInfo />}
      {currentStep === 4 && <StepContactDetails />}
      {currentStep === 5 && <StepReview />}
    </div>
  );
}
