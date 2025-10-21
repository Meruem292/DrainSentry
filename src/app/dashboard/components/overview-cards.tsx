"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WaterLevelIcon from "@/components/icons/water-level-icon";
import WasteBinIcon from "@/components/icons/waste-bin-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Weight } from "lucide-react";

const parseTimestamp = (timestamp: string): Date => {
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(0);
    // new Date(year, monthIndex, day, hours, minutes, seconds)
    return new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
};


export default function OverviewCards({ device, loading }: { device: any, loading: boolean }) {

  const overviewData = React.useMemo(() => {
    let latestWaterLevel = 0;
    let latestBinFullness = 0;
    let latestWasteWeight = 0;
    let binFullnessThreshold = 80;

    if (device) {
        binFullnessThreshold = device.thresholds?.binFullness ?? 80;

        if (device.waterLevelHistory) {
          const waterHistory = Object.values(device.waterLevelHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
          if (waterHistory.length > 0) {
            latestWaterLevel = waterHistory[0].level;
          }
        }

        if (device.wasteBinHistory) {
            const wasteHistory = Object.values(device.wasteBinHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
            if (wasteHistory.length > 0) {
                const latestBinState = wasteHistory[0];
                latestBinFullness = latestBinState.fullness;
                latestWasteWeight = latestBinState.weight;
            }
        }
    }

    const isBinAtCapacity = latestBinFullness > binFullnessThreshold;


    return [
      {
        title: "Latest Water Level",
        value: `${Math.round(latestWaterLevel)}%`,
        description: "from latest reading",
        icon: <WaterLevelIcon className="h-10 w-10 text-primary" />,
      },
      {
        title: "Bin at Capacity",
        value: `${isBinAtCapacity ? 'Yes' : 'No'}`,
        description: `above ${binFullnessThreshold}%`,
        icon: <WasteBinIcon className="h-10 w-10 text-primary" />,
      },
      {
        title: "Latest Waste Weight",
        value: `${latestWasteWeight.toFixed(1)} kg`,
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
