"use client"

import React from "react";
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
import { Skeleton } from "@/components/ui/skeleton";


const chartConfig = {
  level: {
    label: "Water Level",
    color: "hsl(var(--primary))",
  },
};

export default function WaterLevelChart({ device, loading }: { device: any, loading: boolean }) {
  
  const chartData = React.useMemo(() => {
    if (!device || !device.waterLevelHistory) {
      return [
          { time: "06:00", level: 45 }, { time: "07:00", level: 50 },
          { time: "08:00", level: 55 }, { time: "09:00", level: 60 },
          { time: "10:00", level: 58 }, { time: "11:00", level: 62 },
          { time: "12:00", level: 65 }, { time: "13:00", level: 63 },
          { time: "14:00", level: 70 }, { time: "15:00", level: 75 },
          { time: "16:00", level: 72 }, { time: "17:00", level: 68 },
      ];
    }
    
    const history = device.waterLevelHistory;
    
    const dataPoints = Object.values(history)
      .filter((entry: any) => entry.timestamp && entry.level !== undefined)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-12)
      .map((entry: any) => ({
        time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        level: entry.level,
      }));

    if (dataPoints.length === 0) {
        return [
            { time: "06:00", level: 45 }, { time: "07:00", level: 50 },
            { time: "08:00", level: 55 }, { time: "09:00", level: 60 },
            { time: "10:00", level: 58 }, { time: "11:00", level: 62 },
            { time: "12:00", level: 65 }, { time: "13:00", level: 63 },
            { time: "14:00", level: 70 }, { time: "15:00", level: 75 },
            { time: "16:00", level: 72 }, { time: "17:00", level: 68 },
        ];
    }
    return dataPoints;

  }, [device]);
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Level - Recent History</CardTitle>
        <CardDescription>Recent water level readings from this device.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <Skeleton className="h-[300px] w-full" />
        ) : (
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
                dataKey="level"
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
        )}
      </CardContent>
    </Card>
  )
}
