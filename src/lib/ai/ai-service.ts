import { z } from "zod";
import {
  getProvider,
  getModelForTask,
  type AiTaskType as FactoryTaskType,
} from "./providers/factory";
import type { LLMMessage, LLMStructuredResponse } from "./providers/base";
import { logDecision } from "./decision-logger";
import { evaluateConfidence } from "./confidence";
import { trackCost } from "./cost-tracker";
import type { AiTaskType as PrismaTaskType } from "@prisma/client";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const TASK_TYPE_TO_PRISMA: Record<FactoryTaskType, PrismaTaskType> = {
  "email-parser": "EMAIL_PARSER",
  "enquiry-analyzer": "ENQUIRY_ANALYZER",
  "supplier-selector": "SUPPLIER_SELECTOR",
  "bid-evaluator": "BID_EVALUATOR",
  "markup-calculator": "MARKUP_CALCULATOR",
  "quote-content": "QUOTE_CONTENT",
  "job-documents": "JOB_DOCUMENTS",
  "email-personalizer": "EMAIL_PERSONALIZER",
};

interface AiExecutionOptions<T extends z.ZodType> {
  taskType: FactoryTaskType;
  pipelineId?: string;
  enquiryId?: string;
  quoteId?: string;
  bookingId?: string;
  promptVersion?: string;
  messages: LLMMessage[];
  schema: T;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
}

interface AiExecutionResult<T> {
  parsed: T;
  confidence: number;
  autoExecuted: boolean;
  decisionLogId: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  model: string;
}

export async function executeAiTask<T extends z.ZodType>(
  options: AiExecutionOptions<T>
): Promise<AiExecutionResult<z.infer<T>>> {
  const provider = getProvider();
  const model = getModelForTask(options.taskType);
  const prismaTaskType = TASK_TYPE_TO_PRISMA[options.taskType];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }

      const response: LLMStructuredResponse<z.infer<T>> =
        await provider.structuredCompletion({
          model,
          messages: options.messages,
          schema: options.schema,
          schemaName: options.schemaName,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        });

      const confidence =
        typeof response.parsed === "object" &&
        response.parsed !== null &&
        "confidenceScore" in response.parsed
          ? (response.parsed as Record<string, unknown>).confidenceScore as number
          : 1.0;

      const { autoExecuted, action } = evaluateConfidence(
        prismaTaskType,
        confidence
      );

      const costUsd = estimateCost(
        model,
        response.usage.promptTokens,
        response.usage.completionTokens
      );

      const decisionLog = await logDecision({
        taskType: prismaTaskType,
        pipelineId: options.pipelineId,
        promptVersion: options.promptVersion ?? "1.0",
        enquiryId: options.enquiryId,
        quoteId: options.quoteId,
        bookingId: options.bookingId,
        provider: provider.name,
        model: response.model,
        promptMessages: options.messages,
        rawResponse: response.content,
        parsedOutput: response.parsed as unknown,
        confidenceScore: confidence,
        autoExecuted,
        actionTaken: action,
        escalatedReason: !autoExecuted ? "Low confidence score" : undefined,
        latencyMs: response.latencyMs,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCostUsd: costUsd,
      });

      await trackCost({
        taskType: prismaTaskType,
        provider: provider.name,
        model: response.model,
        enquiryId: options.enquiryId,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCostUsd: costUsd,
      });

      return {
        parsed: response.parsed,
        confidence,
        autoExecuted,
        decisionLogId: decisionLog.id,
        usage: response.usage,
        latencyMs: response.latencyMs,
        model: response.model,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `AI task ${options.taskType} attempt ${attempt + 1} failed:`,
        lastError.message
      );
    }
  }

  await logDecision({
    taskType: prismaTaskType,
    pipelineId: options.pipelineId,
    promptVersion: options.promptVersion ?? "1.0",
    enquiryId: options.enquiryId,
    quoteId: options.quoteId,
    bookingId: options.bookingId,
    provider: provider.name,
    model,
    promptMessages: options.messages,
    rawResponse: lastError?.message ?? "Unknown error",
    parsedOutput: null,
    confidenceScore: 0,
    autoExecuted: false,
    actionTaken: "ESCALATED_TO_HUMAN",
    escalatedReason: lastError?.message ?? "All retries exhausted",
    latencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  });

  throw new Error(
    `AI task ${options.taskType} failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`
  );
}

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["gpt-4o-mini"]!;
  return (
    (promptTokens * pricing.input + completionTokens * pricing.output) /
    1_000_000
  );
}
