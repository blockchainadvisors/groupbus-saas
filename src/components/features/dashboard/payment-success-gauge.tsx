"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { CreditCard } from "lucide-react";

interface PaymentSuccessGaugeProps {
  rate: number; // 0–100
}

export function PaymentSuccessGauge({ rate }: PaymentSuccessGaugeProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-full bg-emerald-100 p-1.5 dark:bg-emerald-900/30">
            <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Success Rate</p>
            <p className="text-xs text-muted-foreground">Payment success</p>
          </div>
        </div>
        <div className="flex justify-center">
          <GaugeChart
            value={rate}
            label="success-rate"
            size="sm"
            variant="success"
            showTicks
            animated
          />
        </div>
      </CardContent>
    </Card>
  );
}
