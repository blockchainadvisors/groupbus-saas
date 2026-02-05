"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet } from "lucide-react";

const COLORS = {
  succeeded: "#10b981",
  pending: "#f59e0b",
  failed: "#ef4444",
};

const chartConfig = {
  succeeded: {
    label: "Succeeded",
    color: COLORS.succeeded,
  },
  pending: {
    label: "Pending",
    color: COLORS.pending,
  },
  failed: {
    label: "Failed",
    color: COLORS.failed,
  },
} satisfies ChartConfig;

interface PaymentDonutChartProps {
  succeeded: number;
  pending: number;
  failed: number;
}

export function PaymentDonutChart({ succeeded, pending, failed }: PaymentDonutChartProps) {
  const total = succeeded + pending + failed;

  const chartData = [
    { name: "succeeded", value: succeeded, fill: COLORS.succeeded },
    { name: "pending", value: pending, fill: COLORS.pending },
    { name: "failed", value: failed, fill: COLORS.failed },
  ].filter((d) => d.value > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Payments</CardTitle>
            <CardDescription>{total} total this month</CardDescription>
          </div>
          <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No payments this month.
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
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS.succeeded }}
                />
                <span className="text-muted-foreground">Succeeded</span>
                <span className="ml-auto font-medium">{succeeded}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS.pending }}
                />
                <span className="text-muted-foreground">Pending</span>
                <span className="ml-auto font-medium">{pending}</span>
              </div>
              {failed > 0 && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS.failed }}
                  />
                  <span className="text-muted-foreground">Failed</span>
                  <span className="ml-auto font-medium">{failed}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
