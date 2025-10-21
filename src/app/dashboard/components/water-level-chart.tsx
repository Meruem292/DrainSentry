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

const parseTimestamp = (timestamp: string): Date => {
    // Format: "10/16/2025, 17:27:06"
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(0);
    // new Date(year, monthIndex(0-11), day, hour, minute, second)
    return new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
};


export default function WaterLevelChart({ device, loading }: { device: any, loading: boolean }) {
  
  const chartData = React.useMemo(() => {
    if (!device || !device.waterLevelHistory) {
      return [];
    }
    
    const history = device.waterLevelHistory;
    
    const dataPoints = Object.values(history)
      .filter((entry: any) => entry.timestamp && entry.level !== undefined)
      .sort((a: any, b: any) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime())
      .map((entry: any) => ({
        time: parseTimestamp(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        level: entry.level,
      }));

    if (dataPoints.length === 0) {
        return [];
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
          {chartData.length > 0 ? (
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
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No water level data available.</p>
            </div>
          )}
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
