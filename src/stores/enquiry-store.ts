import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type Step4Data,
} from "@/lib/validations/enquiry";

// ──────────────────────────────────────────────
// State shape
// ──────────────────────────────────────────────

interface EnquiryFormState {
  currentStep: number;

  // Per-step form data (Partial because fields are filled progressively)
  step1: Partial<Step1Data>;
  step2: Partial<Step2Data>;
  step3: Partial<Step3Data>;
  step4: Partial<Step4Data>;
}

interface EnquiryFormActions {
  /** Navigate to a specific step (1-5). */
  setStep: (step: number) => void;

  /** Merge partial data into step 1. */
  updateStep1: (data: Partial<Step1Data>) => void;

  /** Merge partial data into step 2. */
  updateStep2: (data: Partial<Step2Data>) => void;

  /** Merge partial data into step 3. */
  updateStep3: (data: Partial<Step3Data>) => void;

  /** Merge partial data into step 4. */
  updateStep4: (data: Partial<Step4Data>) => void;

  /** Reset the entire wizard to its initial state. */
  reset: () => void;

  /** Validate the current data for the given step using Zod schemas. */
  isStepValid: (step: number) => boolean;
}

type EnquiryStore = EnquiryFormState & EnquiryFormActions;

// ──────────────────────────────────────────────
// Initial state
// ──────────────────────────────────────────────

const initialState: EnquiryFormState = {
  currentStep: 1,
  step1: {},
  step2: {},
  step3: {},
  step4: {},
};

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export const useEnquiryStore = create<EnquiryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => {
        if (step >= 1 && step <= 5) {
          set({ currentStep: step });
        }
      },

      updateStep1: (data) =>
        set((state) => ({ step1: { ...state.step1, ...data } })),

      updateStep2: (data) =>
        set((state) => ({ step2: { ...state.step2, ...data } })),

      updateStep3: (data) =>
        set((state) => ({ step3: { ...state.step3, ...data } })),

      updateStep4: (data) =>
        set((state) => ({ step4: { ...state.step4, ...data } })),

      reset: () => set(initialState),

      isStepValid: (step) => {
        const state = get();

        switch (step) {
          case 1:
            return step1Schema.safeParse(state.step1).success;
          case 2:
            return step2Schema.safeParse(state.step2).success;
          case 3:
            return step3Schema.safeParse(state.step3).success;
          case 4:
            return step4Schema.safeParse(state.step4).success;
          case 5:
            // Step 5 is the review step – valid when all previous steps pass
            return (
              step1Schema.safeParse(state.step1).success &&
              step2Schema.safeParse(state.step2).success &&
              step3Schema.safeParse(state.step3).success &&
              step4Schema.safeParse(state.step4).success
            );
          default:
            return false;
        }
      },
    }),
    {
      name: "enquiry-wizard",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the form data and current step, not actions
      partialize: (state) => ({
        currentStep: state.currentStep,
        step1: state.step1,
        step2: state.step2,
        step3: state.step3,
        step4: state.step4,
      }),
    }
  )
);
