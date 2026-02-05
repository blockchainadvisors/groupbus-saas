import { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/features/settings/profile-form";
import { AiConfigSection } from "@/components/features/settings/ai-config-section";
import { SystemSettingsSection } from "@/components/features/settings/system-settings-section";
import { SecuritySettingsSection } from "@/components/features/settings/security-settings-section";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const activeTab = params.tab ?? "profile";

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(user.role);
  const isSuperAdmin = user.role === "SUPERADMIN";

  // Fetch current user profile
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      passwordHash: true,
      mfaEnabled: true,
    },
  });

  // Fetch AI configs for admins
  let aiConfigs: { id: string; key: string; value: unknown; description: string | null; updatedAt: Date }[] = [];
  if (isAdmin && activeTab === "ai") {
    aiConfigs = await prisma.aiConfig.findMany({
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        updatedAt: true,
      },
      orderBy: { key: "asc" },
    });
  }

  // Fetch system settings for superadmins
  let systemSettings: { id: string; key: string; value: unknown; description: string | null; updatedAt: Date }[] = [];
  if (isSuperAdmin && activeTab === "system") {
    systemSettings = await prisma.setting.findMany({
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        updatedAt: true,
      },
      orderBy: { key: "asc" },
    });
  }

  const tabs = [
    { id: "profile", label: "Profile", visible: true },
    { id: "security", label: "Security", visible: true },
    { id: "ai", label: "AI Configuration", visible: isAdmin },
    { id: "system", label: "System", visible: isSuperAdmin },
  ].filter((t) => t.visible);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and platform settings."
      />

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={`/settings${tab.id === "profile" ? "" : `?tab=${tab.id}`}`}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && profile && (
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information. Changes to your email require
              admin assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              user={{
                id: profile.id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                phone: profile.phone,
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === "security" && profile && (
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Manage your password and authentication methods.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecuritySettingsSection
              hasPassword={!!(profile.passwordHash && profile.passwordHash.length > 0)}
              mfaEnabled={profile.mfaEnabled}
            />
          </CardContent>
        </Card>
      )}

      {/* AI Configuration Tab */}
      {activeTab === "ai" && isAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure AI model behaviour, confidence thresholds, and
                automation parameters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No AI configurations found. AI configs are created as the
                  system processes enquiries.
                </p>
              ) : (
                <AiConfigSection
                  configs={aiConfigs.map((c) => ({
                    id: c.id,
                    key: c.key,
                    value: c.value,
                    description: c.description,
                    updatedAt: c.updatedAt.toISOString(),
                  }))}
                  canEdit={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === "system" && isSuperAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Manage platform-wide configuration values. Changes take effect
                immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemSettings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No system settings configured yet. Use the form below to add
                  your first setting.
                </p>
              ) : (
                <SystemSettingsSection
                  settings={systemSettings.map((s) => ({
                    id: s.id,
                    key: s.key,
                    value: s.value,
                    description: s.description,
                    updatedAt: s.updatedAt.toISOString(),
                  }))}
                />
              )}

              <Separator className="my-6" />

              <SystemSettingsSection isAddForm />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
