"use client";

import { Pie, PieChart, Cell, Label, Sector, ResponsiveContainer } from "recharts";
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
  UNDER_REVIEW: "Review",
  SENT_TO_SUPPLIERS: "To Suppliers",
  QUOTES_RECEIVED: "Quotes In",
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
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-lg"
      />
    );
  };

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-medium">Enquiry Status</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Distribution by status</CardDescription>
          </div>
          <div className="rounded-full bg-cyan-100 p-1.5 sm:p-2 dark:bg-cyan-900/30 shrink-0">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 sm:pb-4 px-2 sm:px-6">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No enquiry data yet.
          </p>
        ) : (
          <div className="flex flex-col items-center">
            <ChartContainer config={chartConfig} className="h-[120px] sm:h-[140px] w-[140px] sm:w-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={35}
                    outerRadius={50}
                    strokeWidth={2}
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
                                y={(viewBox.cy ?? 0) - 5}
                                className="fill-foreground text-lg sm:text-xl font-bold"
                              >
                                {total}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy ?? 0) + 9}
                                className="fill-muted-foreground text-[8px] sm:text-[10px]"
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
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-x-2 sm:gap-x-3 gap-y-1 text-[9px] sm:text-[11px] mt-1 max-w-[180px] sm:max-w-[200px]">
              {chartData.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div
                    className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground truncate">{item.label}</span>
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
