"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

const getProgressClass = (level: number): string => {
    if (level > 80) return '[&>div]:bg-destructive';
    if (level > 60) return '[&>div]:bg-chart-4';
    return '[&>div]:bg-chart-2';
};

export default function WasteBinStatus() {
  const { user } = useUser();
  const path = user ? `users/${user.uid}/wasteBins` : '';
  const { data, loading } = useRtdbValue(path);

  const bins = React.useMemo(() => {
    if (!data) return [];
    return Object.values(data).sort((a: any, b: any) => b.fullness - a.fullness);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waste Bin Levels</CardTitle>
        <CardDescription>Fill status for high-traffic monitored bins.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <div className="space-y-6 pr-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/4" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : bins.length > 0 ? (
              bins.map((bin: any) => (
                <div key={bin.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <p className="font-medium text-sm">{bin.id} - <span className="text-muted-foreground">{bin.location}</span></p>
                    <p className="font-semibold text-sm">{bin.fullness}%</p>
                  </div>
                  <Progress value={bin.fullness} className={cn("h-2", getProgressClass(bin.fullness))} />
                </div>
              ))
            ) : (
                <div className="text-center text-muted-foreground pt-16">No waste bin data available.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
