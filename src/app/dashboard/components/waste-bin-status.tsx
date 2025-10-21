"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import React from "react";

const getProgressClass = (level: number): string => {
    if (level > 80) return '[&>div]:bg-destructive';
    if (level > 60) return '[&>div]:bg-chart-4';
    return '[&>div]:bg-chart-2';
};

export default function WasteBinStatus({ device, loading }: { device: any, loading: boolean }) {

  const bin = React.useMemo(() => {
    if (!device) return null;
    
    const history = device.wasteBinHistory ? Object.values(device.wasteBinHistory) : [];
    const latestEntry: any = history.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    return {
        id: device.id,
        location: device.location,
        fullness: latestEntry ? latestEntry.fullness : 0,
    };
  }, [device]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waste Bin Level</CardTitle>
        <CardDescription>Current fill status for this device.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        ) : bin && bin.fullness > 0 ? (
          <div className="space-y-6 pr-4">
            <div key={bin.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <p className="font-medium text-sm">{bin.id} - <span className="text-muted-foreground">{bin.location}</span></p>
                <p className="font-semibold text-sm">{bin.fullness}%</p>
              </div>
              <Progress value={bin.fullness} className={cn("h-2", getProgressClass(bin.fullness))} />
            </div>
          </div>
        ) : (
            <div className="flex h-24 items-center justify-center">
              <p className="text-center text-muted-foreground">No waste bin data available.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
