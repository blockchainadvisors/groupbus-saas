"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const chartConfig = {
  AUTO_EXECUTED: {
    label: "Auto-Executed",
    color: "var(--color-chart-2)",
  },
  ESCALATED_TO_HUMAN: {
    label: "Escalated",
    color: "var(--color-chart-4)",
  },
  OVERRIDDEN: {
    label: "Overridden",
    color: "var(--color-chart-5)",
  },
} satisfies ChartConfig;

interface AiDistributionChartProps {
  data: { actionTaken: string; count: number }[];
}

export function AiDistributionChart({ data }: AiDistributionChartProps) {
  const chartData = data.map((item) => ({
    name: item.actionTaken,
    value: item.count,
    fill:
      chartConfig[item.actionTaken as keyof typeof chartConfig]?.color ??
      "var(--color-chart-3)",
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Actions</CardTitle>
        <CardDescription>{total} total decisions</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No AI activity yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={70}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
