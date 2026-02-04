"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, Pencil, X } from "lucide-react";

interface AiConfigItem {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

interface AiConfigSectionProps {
  configs: AiConfigItem[];
  canEdit: boolean;
}

export function AiConfigSection({ configs, canEdit }: AiConfigSectionProps) {
  return (
    <div className="space-y-4">
      {configs.map((config, index) => (
        <div key={config.id}>
          {index > 0 && <Separator className="my-4" />}
          <AiConfigRow config={config} canEdit={canEdit} />
        </div>
      ))}
    </div>
  );
}

function AiConfigRow({
  config,
  canEdit,
}: {
  config: AiConfigItem;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [value, setValue] = useState(
    typeof config.value === "string"
      ? config.value
      : JSON.stringify(config.value, null, 2)
  );
  const [description, setDescription] = useState(config.description ?? "");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      // Try to parse as JSON first, fallback to string
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      const response = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: config.key,
          value: parsedValue,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error || "Failed to update configuration.");
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

  const displayValue =
    typeof config.value === "object"
      ? JSON.stringify(config.value, null, 2)
      : String(config.value);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium font-mono">{config.key}</p>
            {success && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          {config.description && !isEditing && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </p>
          )}
        </div>
        {canEdit && !isEditing && (
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
                typeof config.value === "object"
                  ? Math.min(10, displayValue.split("\n").length + 1)
                  : 2
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="text-sm"
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
                  typeof config.value === "string"
                    ? config.value
                    : JSON.stringify(config.value, null, 2)
                );
                setDescription(config.description ?? "");
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
        Last updated: {new Date(config.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}
