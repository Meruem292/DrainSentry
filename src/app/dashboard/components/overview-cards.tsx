"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WaterLevelIcon from "@/components/icons/water-level-icon";
import WasteBinIcon from "@/components/icons/waste-bin-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Weight } from "lucide-react";

export default function OverviewCards({ device, loading }: { device: any, loading: boolean }) {

  const overviewData = React.useMemo(() => {
    let avgWaterLevel = 0;
    let binsAtCapacity = 0;
    let totalWasteWeight = 0;
    let binFullnessThreshold = 80;

    if (device) {
        binFullnessThreshold = device.thresholds?.binFullness ?? 80;

        if (device.waterLevelHistory) {
          const waterHistory = Object.values(device.waterLevelHistory).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          if (waterHistory.length > 0) {
            avgWaterLevel = waterHistory[0].level;
          }
        }

        if (device.wasteBinHistory) {
            const wasteHistory = Object.values(device.wasteBinHistory).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            if (wasteHistory.length > 0) {
                const latestBinState = wasteHistory[0];
                if (latestBinState.fullness > binFullnessThreshold) {
                    binsAtCapacity = 1; 
                }
                totalWasteWeight = latestBinState.weight;
            }
        }
    }


    return [
      {
        title: "Avg. Water Level",
        value: `${Math.round(avgWaterLevel)}%`,
        description: "from latest reading",
        icon: <WaterLevelIcon className="h-10 w-10 text-primary" />,
      },
      {
        title: "Bin at Capacity",
        value: `${binsAtCapacity > 0 ? 'Yes' : 'No'}`,
        description: `above ${binFullnessThreshold}%`,
        icon: <WasteBinIcon className="h-10 w-10 text-primary" />,
      },
      {
        title: "Total Waste Weight",
        value: `${totalWasteWeight.toFixed(1)} kg`,
        description: "from latest reading",
        icon: <Weight className="h-10 w-10 text-primary" />,
      },
    ];
  }, [device]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {overviewData.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            {loading ? (
                <>
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <p className="text-xs text-muted-foreground">
                        {item.description}
                    </p>
                </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
