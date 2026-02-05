"use client";

import { Pie, PieChart, Cell, Label, Sector } from "recharts";
import { useState } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#9ca3af",
  SUBMITTED: "#3b82f6",
  UNDER_REVIEW: "#f59e0b",
  SENT_TO_SUPPLIERS: "#8b5cf6",
  QUOTES_RECEIVED: "#06b6d4",
  QUOTE_SENT: "#ec4899",
  ACCEPTED: "#10b981",
  CANCELLED: "#ef4444",
  EXPIRED: "#6b7280",
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartConfig = data.reduce<ChartConfig>((acc, item) => {
    acc[item.status] = {
      label: STATUS_LABELS[item.status] || item.status,
      color: STATUS_COLORS[item.status] || "#6b7280",
    };
    return acc;
  }, {});

  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.status,
      value: item.count,
      fill: STATUS_COLORS[item.status] || "#6b7280",
      label: STATUS_LABELS[item.status] || item.status,
    }));

  const total = data.reduce((sum, d) => sum + d.count, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-lg"
      />
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Enquiry Status</CardTitle>
            <CardDescription>Distribution by current status</CardDescription>
          </div>
          <div className="rounded-full bg-cyan-100 p-2 dark:bg-cyan-900/30">
            <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No enquiry data yet.
          </p>
        ) : (
          <div className="flex flex-col">
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={75}
                  strokeWidth={3}
                  stroke="hsl(var(--background))"
                  paddingAngle={2}
                  activeIndex={activeIndex ?? undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
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
                              y={(viewBox.cy ?? 0) - 8}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {total}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 10}
                              className="fill-muted-foreground text-xs"
                            >
                              Total
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-2">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
