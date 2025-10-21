"use client"

import React from "react"
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--accent))",
  },
}

const parseTimestamp = (timestamp: string): Date => {
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(0);
    // new Date(year, monthIndex, day, hours, minutes, seconds)
    return new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
};


export default function MethaneLevelChart({ device, loading }: { device: any, loading: boolean }) {

  const chartData = React.useMemo(() => {
    if (!device || !device.wasteBinHistory) {
      return [];
    }
    
    const history = device.wasteBinHistory;
    
    const dataPoints = Object.values(history)
      .filter((entry: any) => entry.timestamp && entry.weight !== undefined)
      .sort((a: any, b: any) => parseTimestamp(a.timestamp).getTime() - parseTimestamp(b.timestamp).getTime());

    if (dataPoints.length === 0) {
      return [];
    }

    return dataPoints.map((entry: any) => ({
      time: parseTimestamp(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      weight: entry.weight, 
    }));

  }, [device]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waste Weight History</CardTitle>
        <CardDescription>
          Total collected waste weight from this device.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        {loading ? (
            <div className="h-[218px] w-full">
                <Skeleton className="h-full w-full" />
            </div>
        ) : (
            <div className="h-[218px]">
              {chartData.length > 0 ? (
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
                      dataKey="weight"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `${value} kg`}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" formatter={(value, name) => [`${Number(value).toFixed(2)} kg`, 'Waste Weight']}/>}
                    />
                    <Area
                        dataKey="weight"
                        type="natural"
                        fill="var(--color-weight)"
                        fillOpacity={0.4}
                        stroke="var(--color-weight)"
                        stackId="a"
                    />
                    </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No waste weight data available.</p>
                </div>
              )}
            </div>
        )}
        {chartData.length > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 pt-4">
              <div className="flex items-center gap-2 font-medium leading-none">
                  Trending up <TrendingUp className="h-4 w-4" />
              </div>
              <div className="leading-none text-muted-foreground">
                  Showing all historical data
              </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
