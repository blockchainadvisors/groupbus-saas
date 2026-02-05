"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const chartConfig = {
  count: {
    label: "Enquiries",
    color: "#f97316",
  },
} satisfies ChartConfig;

interface EnquiryTrendChartProps {
  data: { date: string; count: number }[];
}

export function EnquiryTrendChart({ data }: EnquiryTrendChartProps) {
  const totalEnquiries = data.reduce((sum, d) => sum + d.count, 0);
  const avgPerDay = data.length > 0 ? Math.round(totalEnquiries / data.length * 10) / 10 : 0;

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-medium">Enquiry Trend</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Daily enquiries over the past 14 days</CardDescription>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Avg/day</p>
              <p className="text-base sm:text-lg font-bold text-orange-600">{avgPerDay}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-1.5 sm:p-2 dark:bg-orange-900/30">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 sm:pb-4 px-1 sm:px-6">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            No enquiry data yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[140px] sm:h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -15 }}>
                <defs>
                  <linearGradient id="fillEnquiries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  tick={{ fontSize: 8 }}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 9 }}
                  width={25}
                />
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
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
