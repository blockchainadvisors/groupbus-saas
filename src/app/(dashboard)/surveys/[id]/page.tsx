import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
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
  title: "Edit Survey Template",
};

interface Question {
  id: string;
  text: string;
  type: "rating" | "text" | "yes_no";
  required: boolean;
}

export default async function EditSurveyTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const template = await prisma.surveyTemplate.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      questions: true,
    },
  });

  if (!template) {
    notFound();
  }

  const initialData = {
    id: template.id,
    name: template.name,
    type: template.type as "CUSTOMER_POST_TRIP" | "SUPPLIER_POST_TRIP",
    description: template.description ?? "",
    questions: (template.questions as unknown as Question[]) ?? [],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Survey Template"
        description={`Editing "${template.name}"`}
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
            Update the survey template name, description, and questions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SurveyTemplateForm initialData={initialData} />
        </CardContent>
      </Card>
    </div>
  );
}
