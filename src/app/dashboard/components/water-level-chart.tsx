"use client"

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useUser } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
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

export default function WaterLevelChart() {
  const { user } = useUser();
  const path = user ? `users/${user.uid}/devices` : '';
  const { data: devices, loading } = useRtdbValue(path);
  
  const chartData = React.useMemo(() => {
    if (!devices) return [];

    const deviceId = Object.keys(devices)[0];
    if (!deviceId || !devices[deviceId].wasteBinHistory) return [];
    
    const history = devices[deviceId].wasteBinHistory;
    
    // Filter for entries that have a timestamp and level, then sort and take the last 12
    return Object.values(history)
      .filter((entry: any) => entry.timestamp && entry.level !== undefined)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-12)
      .map((entry: any) => ({
        time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        level: entry.level,
      }));
  }, [devices]);
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water Level - Recent History</CardTitle>
        <CardDescription>Average water level across all monitored sewer lines.</CardDescription>
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
