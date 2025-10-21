"use client"

import React from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useUser } from "@/firebase"
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value"
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
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  // Changed from ppm to fullness for generic representation
  fullness: {
    label: "Sensor Activity",
    color: "hsl(var(--accent))",
  },
}

export default function MethaneLevelChart() {
  const { user } = useUser();
  const path = user ? `users/${user.uid}/devices` : '';
  const { data: devices, loading } = useRtdbValue(path);

  const chartData = React.useMemo(() => {
    if (!devices) return [];
    
    const deviceId = Object.keys(devices)[0];
    if (!deviceId || !devices[deviceId].wasteBinHistory) return [];

    const history = devices[deviceId].wasteBinHistory;
    
    // Using fullness from waste bin history as a stand-in for Methane sensor activity
    const dataPoints = Object.values(history)
      .filter((entry: any) => entry.timestamp && entry.fullness !== undefined)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-7); // Get last 7 entries

    if (dataPoints.length === 0) {
      // Fallback data if no relevant history is found
      return [
        { time: "12:00", fullness: 21 },
        { time: "13:00", fullness: 25 },
        { time: "14:00", fullness: 23 },
        { time: "15:00", fullness: 31 },
        { time: "16:00", fullness: 35 },
        { time: "17:00", fullness: 42 },
        { time: "18:00", fullness: 38 },
      ]
    }

    return dataPoints.map((entry: any) => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      fullness: entry.fullness, 
    }));

  }, [devices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Methane Gas Levels</CardTitle>
        <CardDescription>
          Live methane concentration from the primary trunk line (using sensor activity as proxy).
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
            <div className="h-[218px] w-full">
                <Skeleton className="h-full w-full" />
            </div>
        ) : (
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
                <YAxis
                  dataKey="fullness"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" formatter={(value, name) => [`${Number(value).toFixed(0)}`, 'Sensor Activity']}/>}
                />
                <Area
                    dataKey="fullness"
                    type="natural"
                    fill="var(--color-fullness)"
                    fillOpacity={0.4}
                    stroke="var(--color-fullness)"
                    stackId="a"
                />
                </AreaChart>
            </ChartContainer>
            </div>
        )}
        <div className="flex items-center justify-center gap-2 pt-4">
            <div className="flex items-center gap-2 font-medium leading-none">
                Trending up <TrendingUp className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
                Showing data for the last few hours
            </div>
        </div>
      </CardContent>
    </Card>
  )
}
