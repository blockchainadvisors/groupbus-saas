import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Enquiry Submitted - GroupBus",
  description: "Your enquiry has been submitted successfully.",
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl">Enquiry Submitted!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {ref && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Your reference number</p>
            <p className="mt-1 text-lg font-semibold">{ref}</p>
          </div>
        )}

        <p className="text-muted-foreground">
          We&apos;ll review your enquiry and get back to you with quotes.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Button asChild>
            <Link href="/enquiry">Submit Another Enquiry</Link>
          </Button>
          <Button variant="link" asChild>
            <Link href="/login">Sign in to track your enquiry</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
