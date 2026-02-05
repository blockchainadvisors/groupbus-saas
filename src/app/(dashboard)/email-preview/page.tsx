import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmailPreviewClient } from "./email-preview-client";

export const metadata: Metadata = {
  title: "Email Preview",
  description: "Preview email templates",
};

export default async function EmailPreviewPage() {
  const user = await requireAuth();

  // Only allow admins to access email preview
  if (user.role !== "SUPERADMIN" && user.role !== "ADMIN") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Preview"
        description="Preview and test email templates before sending."
      />
      <EmailPreviewClient />
    </div>
  );
}
