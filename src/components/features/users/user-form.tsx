"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface FormErrors {
  [key: string]: string;
}

interface Organisation {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  organisationId: string | null;
}

interface UserFormProps {
  user?: UserData;
  mode?: "create" | "edit";
}

const ROLES = [
  { value: "SUPERADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "CLIENT", label: "Client" },
  { value: "SUPPLIER", label: "Supplier" },
];

export function UserForm({ user, mode = "create" }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedRole, setSelectedRole] = useState(user?.role ?? "CLIENT");
  const [selectedOrgId, setSelectedOrgId] = useState(user?.organisationId ?? "");

  useEffect(() => {
    async function fetchOrganisations() {
      try {
        const response = await fetch("/api/organisations?limit=100");
        if (response.ok) {
          const data = await response.json();
          // Handle both array and paginated response shapes
          const orgs = Array.isArray(data)
            ? data
            : data.organisations ?? data.items ?? [];
          setOrganisations(orgs);
        }
      } catch {
        // Silently fail - organisations dropdown will be empty
      }
    }
    fetchOrganisations();
  }, []);

  function validate(data: Record<string, string>): FormErrors {
    const newErrors: FormErrors = {};

    if (!data.firstName?.trim()) {
      newErrors.firstName = "First name is required.";
    }
    if (!data.lastName?.trim()) {
      newErrors.lastName = "Last name is required.";
    }
    if (!data.email?.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (mode === "create") {
      if (!data.password?.trim()) {
        newErrors.password = "Password is required.";
      } else if (data.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters.";
      }
    }

    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      password: formData.get("password") as string,
    };

    // Client-side validation
    const newErrors = validate(data);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        role: selectedRole,
        organisationId: selectedOrgId || undefined,
      };

      if (mode === "create") {
        payload.password = data.password;
      }

      const url =
        mode === "edit" ? `/api/users/${user!.id}` : "/api/users";
      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          setServerError(
            result.error || "Something went wrong. Please try again."
          );
        }
        return;
      }

      router.push("/users");
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

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Personal Information
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="First name"
              defaultValue={user?.firstName ?? ""}
              aria-invalid={!!errors.firstName}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Last name"
              defaultValue={user?.lastName ?? ""}
              aria-invalid={!!errors.lastName}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>
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
              placeholder="user@example.com"
              defaultValue={user?.email ?? ""}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+44 1234 567890"
              defaultValue={user?.phone ?? ""}
            />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Account Settings
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organisation">Organisation</Label>
            <Select
              value={selectedOrgId}
              onValueChange={setSelectedOrgId}
            >
              <SelectTrigger id="organisation">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mode === "create" && (
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimum 8 characters"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/users")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
