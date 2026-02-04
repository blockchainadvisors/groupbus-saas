"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface FormErrors {
  [key: string]: string;
}

export function SupplierForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get("companyName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      contactFirstName: formData.get("contactFirstName") as string,
      contactLastName: formData.get("contactLastName") as string,
      contactEmail: formData.get("contactEmail") as string,
    };

    // Client-side validation
    const newErrors: FormErrors = {};

    if (!data.companyName.trim()) {
      newErrors.companyName = "Company name is required.";
    }
    if (!data.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!data.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    }
    if (!data.contactFirstName.trim()) {
      newErrors.contactFirstName = "Contact first name is required.";
    }
    if (!data.contactLastName.trim()) {
      newErrors.contactLastName = "Contact last name is required.";
    }
    if (!data.contactEmail.trim()) {
      newErrors.contactEmail = "Contact email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
      newErrors.contactEmail = "Please enter a valid email address.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        if (result.issues) {
          const fieldErrors: FormErrors = {};
          for (const issue of result.issues) {
            const field = issue.path?.[0];
            if (field) {
              fieldErrors[field] = issue.message;
            }
          }
          setErrors(fieldErrors);
        } else {
          setServerError(result.error || "Something went wrong. Please try again.");
        }
        return;
      }

      const result = await response.json();
      router.push(`/suppliers/${result.id}`);
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Company Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Company Information
        </h3>

        <div className="space-y-2">
          <Label htmlFor="companyName">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="companyName"
            name="companyName"
            placeholder="Enter company name"
            aria-invalid={!!errors.companyName}
          />
          {errors.companyName && (
            <p className="text-xs text-destructive">{errors.companyName}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="company@example.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+44 1234 567890"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            name="address"
            placeholder="Enter company address"
            rows={3}
          />
        </div>
      </div>

      {/* Contact Person */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Primary Contact Person
        </h3>
        <p className="text-sm text-muted-foreground">
          A supplier user account will be created with these details.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactFirstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactFirstName"
              name="contactFirstName"
              placeholder="First name"
              aria-invalid={!!errors.contactFirstName}
            />
            {errors.contactFirstName && (
              <p className="text-xs text-destructive">
                {errors.contactFirstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactLastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contactLastName"
              name="contactLastName"
              placeholder="Last name"
              aria-invalid={!!errors.contactLastName}
            />
            {errors.contactLastName && (
              <p className="text-xs text-destructive">
                {errors.contactLastName}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">
            Contact Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            placeholder="contact@example.com"
            aria-invalid={!!errors.contactEmail}
          />
          {errors.contactEmail && (
            <p className="text-xs text-destructive">{errors.contactEmail}</p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/suppliers")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Supplier
        </Button>
      </div>
    </form>
  );
}
