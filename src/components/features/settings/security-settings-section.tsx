"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, KeyRound, Shield, Mail } from "lucide-react";

interface SecuritySettingsSectionProps {
  hasPassword: boolean;
  mfaEnabled: boolean;
}

export function SecuritySettingsSection({
  hasPassword,
  mfaEnabled,
}: SecuritySettingsSectionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    // Client-side validation
    if (hasPassword && !data.currentPassword) {
      setFieldErrors({ currentPassword: "Current password is required" });
      setIsSubmitting(false);
      return;
    }

    if (!data.newPassword) {
      setFieldErrors({ newPassword: "New password is required" });
      setIsSubmitting(false);
      return;
    }

    if (data.newPassword.length < 8) {
      setFieldErrors({ newPassword: "Password must be at least 8 characters" });
      setIsSubmitting(false);
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.issues) {
          const errors: Record<string, string> = {};
          result.issues.forEach(
            (issue: { path: string[]; message: string }) => {
              if (issue.path[0]) {
                errors[issue.path[0]] = issue.message;
              }
            }
          );
          setFieldErrors(errors);
        }
        setError(result.error || "Failed to update password.");
        return;
      }

      setSuccess(true);
      setShowPasswordForm(false);
      router.refresh();

      // Clear success message after a few seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {hasPassword ? "Password changed successfully." : "Password set successfully."}
        </div>
      )}

      {/* Password Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Password</h3>
              <p className="text-sm text-muted-foreground">
                {hasPassword
                  ? "Change your password to keep your account secure."
                  : "Set a password to sign in without magic links."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPassword ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                Set
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Not Set
              </Badge>
            )}
            {!showPasswordForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                {hasPassword ? "Change" : "Set Password"}
              </Button>
            )}
          </div>
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pl-13 border-l-2 ml-5">
            <div className="pl-4 space-y-4">
              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    Current Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                  />
                  {fieldErrors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {fieldErrors.currentPassword}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your new password"
                />
                {fieldErrors.newPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.newPassword}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and a
                  number.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {hasPassword ? "Change Password" : "Set Password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setFieldErrors({});
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      <Separator />

      {/* Magic Link Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium">Magic Link Sign-In</h3>
            <p className="text-sm text-muted-foreground">
              Sign in via a secure link sent to your email - no password needed.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
          Always Available
        </Badge>
      </div>

      <Separator />

      {/* MFA Section (Future) */}
      <div className="flex items-center justify-between opacity-60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security with an authenticator app.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            Coming Soon
          </Badge>
        </div>
      </div>
    </div>
  );
}
