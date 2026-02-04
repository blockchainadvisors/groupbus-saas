"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  type: "rating" | "text" | "yes_no";
  required: boolean;
}

interface TemplateFormData {
  id?: string;
  name: string;
  description: string;
  type: "CUSTOMER_POST_TRIP" | "SUPPLIER_POST_TRIP";
  questions: Question[];
}

interface SurveyTemplateFormProps {
  initialData?: TemplateFormData;
}

interface FormErrors {
  [key: string]: string;
}

function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createEmptyQuestion(): Question {
  return {
    id: generateQuestionId(),
    text: "",
    type: "rating",
    required: true,
  };
}

export function SurveyTemplateForm({ initialData }: SurveyTemplateFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [type, setType] = useState<"CUSTOMER_POST_TRIP" | "SUPPLIER_POST_TRIP">(
    initialData?.type ?? "CUSTOMER_POST_TRIP"
  );
  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions?.length ? initialData.questions : [createEmptyQuestion()]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateQuestion = useCallback(
    (index: number, field: keyof Question, value: string | boolean) => {
      setQuestions((prev) =>
        prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
      );
    },
    []
  );

  const moveQuestion = useCallback((index: number, direction: "up" | "down") => {
    setQuestions((prev) => {
      const newQuestions = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newQuestions.length) return prev;
      [newQuestions[index], newQuestions[targetIndex]] = [
        newQuestions[targetIndex],
        newQuestions[index],
      ];
      return newQuestions;
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Client-side validation
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Template name is required.";
    }

    if (questions.length === 0) {
      newErrors.questions = "At least one question is required.";
    }

    questions.forEach((q, i) => {
      if (!q.text.trim()) {
        newErrors[`question_${i}_text`] = "Question text is required.";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text.trim(),
        type: q.type,
        required: q.required,
      })),
    };

    try {
      const url = isEditing
        ? `/api/surveys/templates/${initialData.id}`
        : "/api/surveys/templates";

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
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
              fieldErrors[String(field)] = issue.message;
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

      router.push("/surveys");
      router.refresh();
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

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Basic Information
        </h3>

        <div className="space-y-2">
          <Label htmlFor="name">
            Template Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer Post-Trip Satisfaction Survey"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this survey template..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">
            Survey Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={type}
            onValueChange={(value) =>
              setType(value as "CUSTOMER_POST_TRIP" | "SUPPLIER_POST_TRIP")
            }
            disabled={isEditing}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Select survey type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CUSTOMER_POST_TRIP">
                Customer Post-Trip
              </SelectItem>
              <SelectItem value="SUPPLIER_POST_TRIP">
                Supplier Post-Trip
              </SelectItem>
            </SelectContent>
          </Select>
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Survey type cannot be changed after creation.
            </p>
          )}
        </div>
      </div>

      {/* Questions Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Questions
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Question
          </Button>
        </div>

        {errors.questions && (
          <p className="text-xs text-destructive">{errors.questions}</p>
        )}

        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card key={question.id} className="relative">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {/* Reorder controls */}
                  <div className="flex flex-col items-center gap-0.5 pt-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, "up")}
                      aria-label="Move question up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === questions.length - 1}
                      onClick={() => moveQuestion(index, "down")}
                      aria-label="Move question down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Question content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Q{index + 1}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`question-text-${index}`}>
                        Question Text{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`question-text-${index}`}
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(index, "text", e.target.value)
                        }
                        placeholder="Enter question text..."
                        aria-invalid={!!errors[`question_${index}_text`]}
                      />
                      {errors[`question_${index}_text`] && (
                        <p className="text-xs text-destructive">
                          {errors[`question_${index}_text`]}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`question-type-${index}`}>
                          Answer Type
                        </Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) =>
                            updateQuestion(
                              index,
                              "type",
                              value as "rating" | "text" | "yes_no"
                            )
                          }
                        >
                          <SelectTrigger id={`question-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating">
                              Rating (1-5)
                            </SelectItem>
                            <SelectItem value="text">Free Text</SelectItem>
                            <SelectItem value="yes_no">Yes / No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end space-x-2">
                        <label
                          htmlFor={`question-required-${index}`}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            id={`question-required-${index}`}
                            checked={question.required}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                "required",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-input"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={questions.length <= 1}
                    onClick={() => removeQuestion(index)}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addQuestion}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Question
        </Button>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/surveys")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
