"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Star,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
} from "lucide-react";

interface SurveyQuestion {
  id: string;
  text: string;
  type: "rating" | "text" | "yes_no";
  required?: boolean;
}

interface SurveyData {
  status: "pending" | "completed";
  completedAt?: string;
  template?: {
    name: string;
    description?: string;
    questions: SurveyQuestion[];
  };
  booking?: {
    referenceNumber: string;
    enquiry: {
      pickupLocation: string;
      dropoffLocation?: string;
      departureDate: string;
      contactName: string;
    };
  };
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function SurveyForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SurveyData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [overallRating, setOverallRating] = useState<number>(0);
  const [comments, setComments] = useState("");

  useEffect(() => {
    fetch(`/api/surveys/respond/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Survey not found");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/surveys/respond/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, overallRating, comments }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Failed to submit survey");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading survey...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">Survey Not Available</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (data?.status === "completed" || submitted) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center py-12">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <p className="text-xl font-semibold">Thank You!</p>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Your feedback has been submitted. We appreciate you taking the time
            to share your experience.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.template) return null;

  const questions = Array.isArray(data.template.questions)
    ? data.template.questions
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Booking Info */}
      {data.booking && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>
                {data.booking.enquiry.pickupLocation}
                {data.booking.enquiry.dropoffLocation &&
                  ` → ${data.booking.enquiry.dropoffLocation}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(data.booking.enquiry.departureDate)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Booking: {data.booking.referenceNumber}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overall Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            How would you rate your overall experience?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOverallRating(n)}
                className="focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    n <= overallRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Survey Questions */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{data.template.name}</CardTitle>
            {data.template.description && (
              <p className="text-sm text-muted-foreground">
                {data.template.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>
                  {q.text}
                  {q.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {q.type === "rating" && (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: n }))
                        }
                        className="focus:outline-none focus:ring-2 focus:ring-ring rounded"
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            n <= (answers[q.id] as number || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "text" && (
                  <Textarea
                    rows={3}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                  />
                )}
                {q.type === "yes_no" && (
                  <div className="flex gap-3">
                    {["Yes", "No"].map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={
                          answers[q.id] === opt ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                        }
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Additional Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Any other feedback you'd like to share..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </form>
  );
}
