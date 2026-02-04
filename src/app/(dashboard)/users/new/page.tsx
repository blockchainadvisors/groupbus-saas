import { Metadata } from "next";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth-utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { UserForm } from "@/components/features/users/user-form";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "New User",
};

export default async function NewUserPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New User"
        description="Create a new platform user."
      >
        <Button asChild variant="outline">
          <Link href="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </PageHeader>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Enter the user&apos;s personal information and account settings.
            They will be able to log in with the email and password provided.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
