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

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "var(--color-chart-3)",
  SUBMITTED: "var(--color-chart-1)",
  UNDER_REVIEW: "var(--color-chart-4)",
  SENT_TO_SUPPLIERS: "var(--color-chart-2)",
  QUOTES_RECEIVED: "var(--color-chart-3)",
  QUOTE_SENT: "var(--color-chart-4)",
  ACCEPTED: "var(--color-chart-2)",
  CANCELLED: "var(--color-chart-5)",
  EXPIRED: "var(--color-chart-3)",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SENT_TO_SUPPLIERS: "Sent to Suppliers",
  QUOTES_RECEIVED: "Quotes Received",
  QUOTE_SENT: "Quote Sent",
  ACCEPTED: "Accepted",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

interface EnquiryStatusChartProps {
  data: { status: string; count: number }[];
}

export function EnquiryStatusChart({ data }: EnquiryStatusChartProps) {
  const chartConfig = data.reduce<ChartConfig>((acc, item) => {
    acc[item.status] = {
      label: STATUS_LABELS[item.status] || item.status,
      color: STATUS_COLORS[item.status] || "var(--color-chart-3)",
    };
    return acc;
  }, {});

  const chartData = data.map((item) => ({
    name: item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || "var(--color-chart-3)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enquiry Status</CardTitle>
        <CardDescription>Distribution by current status</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No enquiry data yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
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
