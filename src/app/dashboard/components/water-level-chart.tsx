"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
  { time: "00:00", level: 65 },
  { time: "02:00", level: 62 },
  { time: "04:00", level: 68 },
  { time: "06:00", level: 75 },
  { time: "08:00", level: 80 },
  { time: "10:00", level: 78 },
  { time: "12:00", level: 70 },
  { time: "14:00", level: 72 },
  { time: "16:00", level: 74 },
  { time: "18:00", level: 82 },
  { time: "20:00", level: 79 },
  { time: "22:00", level: 71 },
];

const chartConfig = {
  level: {
    label: "Water Level",
    color: "hsl(var(--primary))",
  },
};

export default function WaterLevelChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Level - Last 24 Hours</CardTitle>
        <CardDescription>Average water level across all monitored sewer lines.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <YAxis 
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value, name, props) => [`${props.payload.level}%`, "Water Level"]} />}
            />
            <Bar dataKey="level" fill="var(--color-level)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
