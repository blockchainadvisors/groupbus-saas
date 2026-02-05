"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const COLORS = {
  AUTO_EXECUTED: "#8b5cf6",
  ESCALATED_TO_HUMAN: "#f59e0b",
  OVERRIDDEN: "#ef4444",
};

const LABELS = {
  AUTO_EXECUTED: "Auto-Executed",
  ESCALATED_TO_HUMAN: "Escalated",
  OVERRIDDEN: "Overridden",
};

const chartConfig = {
  AUTO_EXECUTED: {
    label: "Auto-Executed",
    color: COLORS.AUTO_EXECUTED,
  },
  ESCALATED_TO_HUMAN: {
    label: "Escalated",
    color: COLORS.ESCALATED_TO_HUMAN,
  },
  OVERRIDDEN: {
    label: "Overridden",
    color: COLORS.OVERRIDDEN,
  },
} satisfies ChartConfig;

interface AiDistributionChartProps {
  data: { actionTaken: string; count: number }[];
}

export function AiDistributionChart({ data }: AiDistributionChartProps) {
  const chartData = data.map((item) => ({
    name: item.actionTaken,
    value: item.count,
    fill: COLORS[item.actionTaken as keyof typeof COLORS] ?? "#6b7280",
    label: LABELS[item.actionTaken as keyof typeof LABELS] ?? item.actionTaken,
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">AI Actions</CardTitle>
            <CardDescription>{total} total decisions</CardDescription>
          </div>
          <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No AI activity yet.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <ChartContainer config={chartConfig} className="h-[140px] w-[140px] shrink-0">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={60}
                  strokeWidth={3}
                  stroke="hsl(var(--background))"
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} className="drop-shadow-sm" />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {total}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-2 text-sm">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="ml-auto font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
