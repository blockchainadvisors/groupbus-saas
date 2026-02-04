import { Metadata } from "next";
import { EnquiryWizard } from "@/components/features/enquiry/enquiry-wizard";

export const metadata: Metadata = {
  title: "Get a Quote - GroupBus",
  description: "Submit your coach or bus hire enquiry and receive competitive quotes.",
};

export default function EnquiryPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Get a Quote</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your trip and we&apos;ll get you the best prices from our verified operators.
        </p>
      </div>
      <EnquiryWizard />
    </div>
  );
}
