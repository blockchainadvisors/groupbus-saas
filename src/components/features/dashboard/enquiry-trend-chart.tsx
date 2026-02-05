"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const chartConfig = {
  count: {
    label: "Enquiries",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

interface EnquiryTrendChartProps {
  data: { date: string; count: number }[];
}

export function EnquiryTrendChart({ data }: EnquiryTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enquiry Trend</CardTitle>
        <CardDescription>Daily enquiries over the past 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No enquiry data yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillEnquiries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                }}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) => {
                      return new Date(v).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });
                    }}
                  />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                fill="url(#fillEnquiries)"
                stroke="var(--color-count)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
