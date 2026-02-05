"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { CreditCard } from "lucide-react";

interface PaymentSuccessGaugeProps {
  rate: number; // 0–100
}

export function PaymentSuccessGauge({ rate }: PaymentSuccessGaugeProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Success Rate</CardTitle>
            <CardDescription>Payment success percentage</CardDescription>
          </div>
          <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/30">
            <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center pb-6 pt-2">
        <GaugeChart
          value={rate}
          label="success-rate"
          size="md"
          variant="success"
          showTicks
          animated
        />
      </CardContent>
    </Card>
  );
}
