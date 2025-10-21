"use client"

import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
    { time: "12:00", ppm: 2.1 },
    { time: "13:00", ppm: 2.5 },
    { time: "14:00", ppm: 2.3 },
    { time: "15:00", ppm: 3.1 },
    { time: "16:00", ppm: 3.5 },
    { time: "17:00", ppm: 4.2 },
    { time: "18:00", ppm: 3.8 },
]

const chartConfig = {
  ppm: {
    label: "ppm",
    color: "hsl(var(--accent))",
  },
}

export default function MethaneLevelChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Methane Gas Levels</CardTitle>
        <CardDescription>
          Live methane concentration from the primary trunk line.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[218px]">
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 5)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="ppm"
                type="natural"
                fill="var(--color-ppm)"
                fillOpacity={0.4}
                stroke="var(--color-ppm)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </div>
        <div className="flex items-center justify-center gap-2 pt-4">
            <div className="flex items-center gap-2 font-medium leading-none">
                Trending up <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
                Showing data for the last 6 hours
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
