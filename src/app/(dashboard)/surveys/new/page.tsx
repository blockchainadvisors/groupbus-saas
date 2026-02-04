import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SurveyTemplateForm } from "@/components/features/surveys/survey-template-form";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "New Survey Template",
};

export default async function NewSurveyTemplatePage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Survey Template"
        description="Create a new survey template for feedback collection."
      >
        <Button asChild variant="outline">
          <Link href="/surveys">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </PageHeader>

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Define the survey template name, type, and questions. Questions can
            be reordered and configured as required or optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SurveyTemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
