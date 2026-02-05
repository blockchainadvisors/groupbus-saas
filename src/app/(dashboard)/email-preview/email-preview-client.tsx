"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Smartphone, RefreshCw, Mail, Code } from "lucide-react";

type TemplateType = "quote" | "booking-confirmation" | "enquiry-confirmation";

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: "quote", label: "Quote Email", description: "Sent to customers with pricing" },
  { value: "booking-confirmation", label: "Booking Confirmation", description: "Sent after payment" },
  { value: "enquiry-confirmation", label: "Enquiry Confirmation", description: "Sent when enquiry received" },
];

export function EmailPreviewClient() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("quote");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "html">("preview");

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/email-preview?template=${selectedTemplate}`);
      const data = await response.json();
      if (data.html) {
        setPreviewHtml(data.html);
      }
    } catch (error) {
      console.error("Failed to load preview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load preview on mount and when template changes
  useState(() => {
    loadPreview();
  });

  const handleTemplateChange = (value: TemplateType) => {
    setSelectedTemplate(value);
    // Load preview for new template
    setTimeout(() => {
      fetch(`/api/email-preview?template=${value}`)
        .then(res => res.json())
        .then(data => {
          if (data.html) {
            setPreviewHtml(data.html);
          }
        });
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Template</label>
              <Select value={selectedTemplate} onValueChange={(v) => handleTemplateChange(v as TemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("desktop")}
              >
                <Monitor className="h-4 w-4 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("mobile")}
              >
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </Button>
            </div>

            <Button onClick={loadPreview} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {TEMPLATE_OPTIONS.find(t => t.value === selectedTemplate)?.label}
              </CardTitle>
              <CardDescription>
                Preview with sample data - graphical elements work without image approval
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "preview" | "html")}>
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="html">
                  <Code className="h-4 w-4 mr-1" />
                  HTML
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab}>
            <TabsContent value="preview" className="mt-0">
              <div
                className={`mx-auto border rounded-lg overflow-hidden bg-slate-100 transition-all duration-300 ${
                  viewMode === "mobile" ? "max-w-[375px]" : "max-w-[800px]"
                }`}
              >
                {/* Email client mockup header */}
                <div className="bg-slate-200 px-4 py-2 border-b flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center text-xs text-slate-500">
                    {viewMode === "mobile" ? "Mobile Preview (375px)" : "Desktop Preview (800px)"}
                  </div>
                </div>

                {/* Email content */}
                <div className="bg-white">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ height: viewMode === "mobile" ? "700px" : "800px" }}
                      title="Email Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                      {isLoading ? "Loading preview..." : "Select a template to preview"}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="html" className="mt-0">
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                  <code>{previewHtml || "No HTML generated"}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => navigator.clipboard.writeText(previewHtml)}
                >
                  Copy HTML
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Features info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Graphical Elements (No Approval Required)</CardTitle>
          <CardDescription>
            These templates use CSS-only graphics that display without user approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl mb-2">&#128652;</div>
              <p className="font-medium text-sm">Unicode Icons</p>
              <p className="text-xs text-muted-foreground">Bus, checkmarks, stars, arrows</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="h-6 w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded mb-2" />
              <p className="font-medium text-sm">CSS Gradients</p>
              <p className="text-xs text-muted-foreground">Colorful backgrounds without images</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex gap-1 mb-2">
                <div className="h-6 w-6 rounded-full bg-green-100 border-2 border-green-500" />
                <div className="h-6 w-6 rounded bg-blue-100 border-2 border-blue-500" />
              </div>
              <p className="font-medium text-sm">CSS Shapes</p>
              <p className="text-xs text-muted-foreground">Circles, badges, dividers</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="h-6 border-2 border-dashed border-purple-400 rounded mb-2" />
              <p className="font-medium text-sm">Styled Borders</p>
              <p className="text-xs text-muted-foreground">Dashed, solid, colored borders</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
