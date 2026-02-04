"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, Pencil, X, Plus } from "lucide-react";

interface SettingItem {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

interface SystemSettingsSectionProps {
  settings?: SettingItem[];
  isAddForm?: boolean;
}

export function SystemSettingsSection({
  settings,
  isAddForm,
}: SystemSettingsSectionProps) {
  if (isAddForm) {
    return <AddSettingForm />;
  }

  if (!settings || settings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {settings.map((setting, index) => (
        <div key={setting.id}>
          {index > 0 && <Separator className="my-4" />}
          <SettingRow setting={setting} />
        </div>
      ))}
    </div>
  );
}

function SettingRow({ setting }: { setting: SettingItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [value, setValue] = useState(
    typeof setting.value === "string"
      ? setting.value
      : JSON.stringify(setting.value, null, 2)
  );
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayValue =
    typeof setting.value === "object"
      ? JSON.stringify(setting.value, null, 2)
      : String(setting.value);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: setting.key,
          value: parsedValue,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "Failed to update setting.");
        return;
      }

      setSuccess(true);
      setIsEditing(false);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium font-mono">{setting.key}</p>
            {success && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          {setting.description && !isEditing && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {setting.description}
            </p>
          )}
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Value (JSON or plain text)</Label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={
                typeof setting.value === "object"
                  ? Math.min(10, displayValue.split("\n").length + 1)
                  : 2
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setValue(
                  typeof setting.value === "string"
                    ? setting.value
                    : JSON.stringify(setting.value, null, 2)
                );
                setError(null);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {displayValue}
        </pre>
      )}

      <p className="text-xs text-muted-foreground">
        Last updated: {new Date(setting.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function AddSettingForm() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!key.trim()) {
      setError("Key is required.");
      return;
    }

    if (!value.trim()) {
      setError("Value is required.");
      return;
    }

    setIsSaving(true);

    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          value: parsedValue,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "Failed to save setting.");
        return;
      }

      setSuccess(true);
      setKey("");
      setValue("");
      setDescription("");
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Add / Update Setting
      </h4>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2 text-xs text-emerald-700 flex items-center gap-1">
          <Check className="h-3 w-3" /> Setting saved successfully.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="setting-key" className="text-xs">
            Key <span className="text-destructive">*</span>
          </Label>
          <Input
            id="setting-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. platform.name"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="setting-description" className="text-xs">
            Description
          </Label>
          <Input
            id="setting-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setting-value" className="text-xs">
          Value (JSON or plain text) <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="setting-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder='e.g. "GroupBus" or {"key": "value"}'
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          Save Setting
        </Button>
      </div>
    </form>
  );
}
