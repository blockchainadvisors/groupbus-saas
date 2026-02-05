"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const chartConfig = {
  rate: {
    label: "Success Rate",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

interface PaymentSuccessGaugeProps {
  rate: number; // 0–100
}

export function PaymentSuccessGauge({ rate }: PaymentSuccessGaugeProps) {
  const data = [{ name: "rate", value: rate, fill: "var(--color-rate)" }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Success Rate</CardTitle>
        <CardDescription>Payment success percentage</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ChartContainer config={chartConfig} className="h-[140px] w-[200px]">
          <RadialBarChart
            innerRadius={60}
            outerRadius={85}
            data={data}
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="100%"
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background
              className="[&_.recharts-radial-bar-background-sector]:fill-muted"
            />
          </RadialBarChart>
        </ChartContainer>
        <p className="text-2xl font-bold -mt-4">{rate}%</p>
      </CardContent>
    </Card>
  );
}
