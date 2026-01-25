"use client"

import { CartesianGrid, XAxis, YAxis, AreaChart, Area } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { DashboardData } from "@/types/dashboard"
import { format, parseISO } from "date-fns";

export function ReviewedLinesChart({ data }: { data: DashboardData }) {

  const reviewedLinesTrendData = (data.trends?.daily_reviewed_lines_of_code ?? []).map((d) => ({
    date: format(parseISO(`${d.date}T00:00:00Z`), "MMM dd"),
    count: d.count,
  }));

  // Use backend-calculated total lines reviewed
  const totalLinesReviewed = data.trends?.total_lines_reviewed ?? 0;

  // Format number with k, M abbreviations for large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  const singleSeriesConfig = {
    count: {
      label: "Lines",
      color: "var(--color-primary)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="text-sm">Reviewed Lines of Code</CardTitle>
        <CardDescription>Lines of code reviewed over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 -mt-2">
          <p className="text-4xl font-bold">{formatNumber(totalLinesReviewed)} <span className="text-sm">Lines</span></p>
        </div>
        <ChartContainer config={singleSeriesConfig}>
          <AreaChart
            accessibilityLayer
            data={reviewedLinesTrendData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <defs>
              <linearGradient id="fillCountLOCChart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              strokeWidth={2}
              fill="url(#fillCountLOCChart)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
