"use client";

import { Bar, BarChart, XAxis, YAxis, Cell, LabelList } from "recharts";
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

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  const stages = [
    { stage: "Enquiries", value: data.totalEnquiries },
    { stage: "Sent to Suppliers", value: data.sentToSuppliers },
    { stage: "Quotes Received", value: data.quotesReceived },
    { stage: "Sent to Customer", value: data.quoteSentToCustomer },
    { stage: "Accepted", value: data.acceptedQuotes },
    { stage: "Confirmed", value: data.confirmedBookings },
    { stage: "Completed", value: data.completedBookings },
  ].map((item, i) => ({
    ...item,
    fill: STAGE_COLORS[i],
    rate:
      data.totalEnquiries > 0
        ? Math.round((item.value / data.totalEnquiries) * 100)
        : 0,
  }));

  const conversionRate = data.totalEnquiries > 0
    ? Math.round((data.completedBookings / data.totalEnquiries) * 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Pipeline Funnel (This Month)</CardTitle>
            <CardDescription>Conversion from enquiry to completion</CardDescription>
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
      <CardContent className="pt-0">
        {data.totalEnquiries === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No pipeline data this month.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart
              data={stages}
              layout="vertical"
              margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
            >
              <YAxis
                dataKey="stage"
                type="category"
                tickLine={false}
                axisLine={false}
                width={115}
                tickMargin={4}
                tick={{ fontSize: 12 }}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <span>
                        {value} ({item.payload.rate}% of enquiries)
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
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
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
