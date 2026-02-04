import type { AiTaskType, AiActionTaken } from "@prisma/client";

const DEFAULT_THRESHOLDS: Record<AiTaskType, number> = {
  EMAIL_PARSER: 0.75,
  ENQUIRY_ANALYZER: 0.60,
  SUPPLIER_SELECTOR: 0.70,
  BID_EVALUATOR: 0.80,
  MARKUP_CALCULATOR: 0.70,
  QUOTE_CONTENT: 0.50,
  JOB_DOCUMENTS: 0.50,
  EMAIL_PERSONALIZER: 0.50,
};

let thresholdCache: Record<string, number> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function loadThresholds(): Promise<Record<string, number>> {
  if (thresholdCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return thresholdCache;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const config = await prisma.aiConfig.findUnique({
      where: { key: "confidence_thresholds" },
    });
    if (config?.value && typeof config.value === "object") {
      thresholdCache = config.value as Record<string, number>;
      cacheLoadedAt = Date.now();
      return thresholdCache;
    }
  } catch {
    // DB not available, use defaults
  }

  return {};
}

export function evaluateConfidence(
  taskType: AiTaskType,
  confidence: number
): { autoExecuted: boolean; action: AiActionTaken } {
  const threshold = DEFAULT_THRESHOLDS[taskType] ?? 0.7;

  if (confidence >= threshold) {
    return { autoExecuted: true, action: "AUTO_EXECUTED" };
  }

  return {
    autoExecuted: false,
    action: "ESCALATED_TO_HUMAN",
  };
}

export function getThreshold(taskType: AiTaskType): number {
  return DEFAULT_THRESHOLDS[taskType] ?? 0.7;
}
