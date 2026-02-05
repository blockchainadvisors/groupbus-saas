"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const chartConfig = {
  value: {
    label: "Count",
    color: "var(--color-chart-1)",
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
  "var(--color-chart-1)",
  "var(--color-chart-3)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-2)",
  "var(--color-chart-2)",
  "var(--color-chart-2)",
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
        ? `${Math.round((item.value / data.totalEnquiries) * 100)}%`
        : "0%",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funnel (This Month)</CardTitle>
        <CardDescription>Conversion from enquiry to completion</CardDescription>
      </CardHeader>
      <CardContent>
        {data.totalEnquiries === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No pipeline data this month.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={stages} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="stage"
                type="category"
                tickLine={false}
                axisLine={false}
                width={120}
                tickMargin={4}
              />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <span>
                        {value} ({item.payload.rate})
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
