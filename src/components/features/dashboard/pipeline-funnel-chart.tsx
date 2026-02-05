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
  { full: "Sent to Suppliers", short: "Supp" },
  { full: "Quotes Received", short: "Recv" },
  { full: "Sent to Customer", short: "Sent" },
  { full: "Accepted", short: "Acc" },
  { full: "Confirmed", short: "Conf" },
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
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-medium">Pipeline Funnel</CardTitle>
            <CardDescription className="hidden sm:block text-xs">Conversion from enquiry to completion</CardDescription>
            <CardDescription className="sm:hidden text-[10px]">This month</CardDescription>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Conv.</p>
              <p className="text-base sm:text-lg font-bold text-emerald-600">{conversionRate}%</p>
            </div>
            <div className="rounded-full bg-indigo-100 p-1.5 sm:p-2 dark:bg-indigo-900/30">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 sm:pb-4 px-2 sm:px-6">
        {data.totalEnquiries === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No pipeline data this month.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stages}
                layout="vertical"
                margin={{ top: 0, right: 25, bottom: 0, left: 0 }}
                barCategoryGap="15%"
              >
                <XAxis type="number" domain={[0, maxValue]} hide />
                <YAxis
                  dataKey="stageShort"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickMargin={2}
                  tick={{ fontSize: 9 }}
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
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} maxBarSize={22}>
                  {stages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} className="drop-shadow-sm" />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    className="fill-foreground text-[10px] sm:text-xs font-medium"
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
