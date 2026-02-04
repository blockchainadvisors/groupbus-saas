import { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SupplierForm } from "@/components/features/suppliers/supplier-form";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "New Supplier",
};

export default async function NewSupplierPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Supplier"
        description="Register a new supplier organisation."
      >
        <Button asChild variant="outline">
          <Link href="/suppliers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Suppliers
          </Link>
        </Button>
      </PageHeader>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
          <CardDescription>
            Enter the supplier company information and primary contact person
            details. A user account will be created for the contact person.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierForm />
        </CardContent>
      </Card>
    </div>
  );
}
