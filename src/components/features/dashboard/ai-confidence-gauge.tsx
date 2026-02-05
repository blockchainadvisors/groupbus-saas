"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const chartConfig = {
  confidence: {
    label: "Avg Confidence",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

interface AiConfidenceGaugeProps {
  avgConfidence: number; // 0–100
}

export function AiConfidenceGauge({ avgConfidence }: AiConfidenceGaugeProps) {
  const data = [{ name: "confidence", value: avgConfidence, fill: "var(--color-confidence)" }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Confidence</CardTitle>
        <CardDescription>Average decision confidence</CardDescription>
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
        <p className="text-2xl font-bold -mt-4">{avgConfidence}%</p>
      </CardContent>
    </Card>
  );
}
