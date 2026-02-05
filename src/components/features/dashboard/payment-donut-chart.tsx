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
  succeeded: {
    label: "Succeeded",
    color: "var(--color-chart-2)",
  },
  pending: {
    label: "Pending",
    color: "var(--color-chart-4)",
  },
  failed: {
    label: "Failed",
    color: "var(--color-chart-5)",
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
    { name: "succeeded", value: succeeded, fill: "var(--color-succeeded)" },
    { name: "pending", value: pending, fill: "var(--color-pending)" },
    { name: "failed", value: failed, fill: "var(--color-failed)" },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>{total} total this month</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No payments this month.
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
