import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AiTaskType } from "@prisma/client";

type Period = "today" | "week" | "month";

function getPeriodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "month": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return start;
    }
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") ?? "today";
    const period: Period =
      periodParam === "week" || periodParam === "month"
        ? periodParam
        : "today";

    const periodStart = getPeriodStart(period);

    // Fetch cost records and recent decisions in parallel
    const [costRecords, recentDecisions] = await Promise.all([
      prisma.aiCostRecord.findMany({
        where: { createdAt: { gte: periodStart } },
        select: {
          taskType: true,
          estimatedCostUsd: true,
        },
      }),
      prisma.aiDecisionLog.findMany({
        select: {
          id: true,
          taskType: true,
          model: true,
          confidenceScore: true,
          autoExecuted: true,
          estimatedCostUsd: true,
          latencyMs: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // Calculate totals
    const totalCost = costRecords.reduce(
      (sum, r) => sum + r.estimatedCostUsd,
      0
    );
    const totalCalls = costRecords.length;

    // Build cost breakdown by task type
    const costByTaskTypeMap = new Map<
      AiTaskType,
      { totalCost: number; count: number }
    >();

    for (const record of costRecords) {
      const existing = costByTaskTypeMap.get(record.taskType) ?? {
        totalCost: 0,
        count: 0,
      };
      existing.totalCost += record.estimatedCostUsd;
      existing.count += 1;
      costByTaskTypeMap.set(record.taskType, existing);
    }

    const costByTaskType = Array.from(costByTaskTypeMap.entries())
      .map(([taskType, data]) => ({
        taskType,
        totalCost: data.totalCost,
        count: data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({
      totalCost,
      totalCalls,
      costByTaskType,
      recentDecisions,
    });
  } catch (error) {
    console.error("AI costs GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
