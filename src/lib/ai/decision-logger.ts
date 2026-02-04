import { prisma } from "@/lib/prisma";
import type { AiActionTaken, AiTaskType } from "@prisma/client";

interface DecisionLogInput {
  taskType: AiTaskType;
  pipelineId?: string;
  promptVersion: string;
  enquiryId?: string;
  quoteId?: string;
  bookingId?: string;
  provider: string;
  model: string;
  promptMessages: unknown;
  rawResponse: unknown;
  parsedOutput: unknown;
  confidenceScore: number;
  autoExecuted: boolean;
  actionTaken: AiActionTaken;
  escalatedReason?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export async function logDecision(input: DecisionLogInput) {
  return prisma.aiDecisionLog.create({
    data: {
      taskType: input.taskType,
      pipelineId: input.pipelineId,
      promptVersion: input.promptVersion,
      enquiryId: input.enquiryId,
      quoteId: input.quoteId,
      bookingId: input.bookingId,
      provider: input.provider,
      model: input.model,
      promptMessages: input.promptMessages as any,
      rawResponse: input.rawResponse as any,
      parsedOutput: input.parsedOutput as any,
      confidenceScore: input.confidenceScore,
      autoExecuted: input.autoExecuted,
      actionTaken: input.actionTaken,
      escalatedReason: input.escalatedReason,
      latencyMs: input.latencyMs,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      estimatedCostUsd: input.estimatedCostUsd,
    },
  });
}
