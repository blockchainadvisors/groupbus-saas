"use client";

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter } from "lucide-react";

const chartConfig = {
  value: {
    label: "Count",
  },
} satisfies ChartConfig;

interface PipelineFunnelChartProps {
  data: {
    totalEnquiries: number;
    sentToSuppliers: number;
    quotesReceived: number;
    quoteSentToCustomer: number;
    acceptedQuotes: number;
    confirmedBookings: number;
    completedBookings: number;
  };
}

const STAGE_COLORS = [
  "#3b82f6", // blue - Enquiries
  "#8b5cf6", // purple - Sent to Suppliers
  "#06b6d4", // cyan - Quotes Received
  "#ec4899", // pink - Sent to Customer
  "#f59e0b", // amber - Accepted
  "#10b981", // emerald - Confirmed
  "#059669", // dark emerald - Completed
];

const STAGE_LABELS = [
  { full: "Enquiries", short: "Enq" },
  { full: "Sent to Suppliers", short: "Suppliers" },
  { full: "Quotes Received", short: "Received" },
  { full: "Sent to Customer", short: "Sent" },
  { full: "Accepted", short: "Accepted" },
  { full: "Confirmed", short: "Confirmed" },
  { full: "Completed", short: "Done" },
];

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  const stageValues = [
    data.totalEnquiries,
    data.sentToSuppliers,
    data.quotesReceived,
    data.quoteSentToCustomer,
    data.acceptedQuotes,
    data.confirmedBookings,
    data.completedBookings,
  ];

  const stages = STAGE_LABELS.map((label, i) => ({
    stage: label.full,
    stageShort: label.short,
    value: stageValues[i],
    fill: STAGE_COLORS[i],
    rate:
      data.totalEnquiries > 0
        ? Math.round((stageValues[i] / data.totalEnquiries) * 100)
        : 0,
  }));

  const conversionRate = data.totalEnquiries > 0
    ? Math.round((data.completedBookings / data.totalEnquiries) * 100)
    : 0;

  const maxValue = Math.max(...stageValues, 1);

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Pipeline Funnel</CardTitle>
            <CardDescription className="hidden sm:block">Conversion from enquiry to completion</CardDescription>
            <CardDescription className="sm:hidden">This month</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Conversion</p>
              <p className="text-lg font-bold text-emerald-600">{conversionRate}%</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/30">
              <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {data.totalEnquiries === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No pipeline data this month.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stages}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                barCategoryGap="20%"
              >
                <XAxis type="number" domain={[0, maxValue]} hide />
                <YAxis
                  dataKey="stageShort"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickMargin={4}
                  tick={{ fontSize: 11 }}
                  className="hidden sm:block"
                />
                <YAxis
                  dataKey="stageShort"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={55}
                  tickMargin={2}
                  tick={{ fontSize: 10 }}
                  className="sm:hidden"
                  yAxisId="mobile"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => (
                        <span>
                          {item.payload.stage}: {value} ({item.payload.rate}%)
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20} maxBarSize={28}>
                  {stages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} className="drop-shadow-sm" />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    className="fill-foreground text-xs font-medium"
                    formatter={(value: number) => value}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
