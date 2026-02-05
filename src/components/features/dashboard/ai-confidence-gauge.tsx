"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { Brain } from "lucide-react";

interface AiConfidenceGaugeProps {
  avgConfidence: number; // 0–100
}

export function AiConfidenceGauge({ avgConfidence }: AiConfidenceGaugeProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">AI Confidence</CardTitle>
            <CardDescription>Average decision confidence</CardDescription>
          </div>
          <div className="rounded-full bg-violet-100 p-2 dark:bg-violet-900/30">
            <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center pb-6 pt-2">
        <GaugeChart
          value={avgConfidence}
          label="ai-confidence"
          size="md"
          variant="gradient"
          showTicks
          animated
        />
      </CardContent>
    </Card>
  );
}
