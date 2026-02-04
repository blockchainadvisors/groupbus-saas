import { prisma } from "@/lib/prisma";
import type { AiTaskType } from "@prisma/client";

interface CostInput {
  taskType: AiTaskType;
  provider: string;
  model: string;
  enquiryId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export async function trackCost(input: CostInput): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.aiCostRecord.create({
    data: {
      date: today,
      taskType: input.taskType,
      provider: input.provider,
      model: input.model,
      enquiryId: input.enquiryId,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      estimatedCostUsd: input.estimatedCostUsd,
    },
  });

  await checkDailyBudget(today);
}

async function checkDailyBudget(today: Date): Promise<void> {
  try {
    const config = await prisma.aiConfig.findUnique({
      where: { key: "daily_cost_budget" },
    });

    if (!config?.value) return;

    const budget =
      typeof config.value === "object" && config.value !== null
        ? (config.value as Record<string, unknown>).budgetUsd ?? 50
        : 50;

    const todayCosts = await prisma.aiCostRecord.aggregate({
      where: { date: today },
      _sum: { estimatedCostUsd: true },
    });

    const totalCost = todayCosts._sum.estimatedCostUsd ?? 0;
    const percentage = (totalCost / (budget as number)) * 100;

    if (percentage >= 100) {
      console.warn(
        `[AI COST] BUDGET EXCEEDED: $${totalCost.toFixed(4)} / $${budget} (${percentage.toFixed(1)}%)`
      );
    } else if (percentage >= 80) {
      console.warn(
        `[AI COST] Budget warning: $${totalCost.toFixed(4)} / $${budget} (${percentage.toFixed(1)}%)`
      );
    }
  } catch (error) {
    console.error("[AI COST] Failed to check daily budget:", error);
  }
}

export async function getDailyCostSummary(date?: Date) {
  const targetDate = date ?? new Date();
  targetDate.setHours(0, 0, 0, 0);

  const records = await prisma.aiCostRecord.groupBy({
    by: ["taskType", "model"],
    where: { date: targetDate },
    _sum: {
      estimatedCostUsd: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
    },
    _count: true,
  });

  const total = records.reduce(
    (sum, r) => sum + (r._sum.estimatedCostUsd ?? 0),
    0
  );

  return { date: targetDate, records, totalCostUsd: total };
}
