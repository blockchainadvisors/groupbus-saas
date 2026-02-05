"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { Brain } from "lucide-react";

interface AiConfidenceGaugeProps {
  avgConfidence: number; // 0–100
}

export function AiConfidenceGauge({ avgConfidence }: AiConfidenceGaugeProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-full bg-violet-100 p-1.5 dark:bg-violet-900/30">
            <Brain className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium">AI Confidence</p>
            <p className="text-xs text-muted-foreground">Avg decision score</p>
          </div>
        </div>
        <div className="flex justify-center">
          <GaugeChart
            value={avgConfidence}
            label="ai-confidence"
            size="sm"
            variant="gradient"
            showTicks
            animated
          />
        </div>
      </CardContent>
    </Card>
  );
}
