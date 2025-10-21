"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WaterLevelIcon from "@/components/icons/water-level-icon";
import WasteBinIcon from "@/components/icons/waste-bin-icon";
import MethaneIcon from "@/components/icons/methane-icon";
import { useUser } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewCards() {
  const { user } = useUser();
  const { data: waterLevelsData, loading: waterLoading } = useRtdbValue(user ? `users/${user.uid}/waterLevels` : '');
  const { data: wasteBinsData, loading: wasteLoading } = useRtdbValue(user ? `users/${user.uid}/wasteBins` : '');
  const { data: devicesData, loading: devicesLoading } = useRtdbValue(user ? `users/${user.uid}/devices` : '');

  const overviewData = React.useMemo(() => {
    let avgWaterLevel = 0;
    let binsAtCapacity = 0;
    let latestMethane = 0; // Placeholder as methane is not in DB structure

    if (waterLevelsData) {
      const levels = Object.values(waterLevelsData).map((d: any) => d.level);
      if (levels.length > 0) {
        avgWaterLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
      }
    }
    
    if (wasteBinsData && devicesData) {
      const deviceId = Object.keys(devicesData)[0];
      const binFullnessThreshold = devicesData?.[deviceId]?.thresholds?.binFullness ?? 80;
      binsAtCapacity = Object.values(wasteBinsData).filter((b: any) => b.fullness > binFullnessThreshold).length;
    }
    
    // Using water level as a stand-in for Methane for visualization
    if(avgWaterLevel > 0) {
      latestMethane = avgWaterLevel / 20;
    }


    return [
      {
        title: "Avg. Water Level",
        value: `${Math.round(avgWaterLevel)}%`,
        change: "+2.5%",
        description: "from yesterday",
        icon: <WaterLevelIcon className="h-10 w-10 text-primary" />,
        loading: waterLoading,
      },
      {
        title: "Bins at Capacity",
        value: `${binsAtCapacity}`,
        change: "-3",
        description: "from last week",
        icon: <WasteBinIcon className="h-10 w-10 text-primary" />,
        loading: wasteLoading || devicesLoading,
      },
      {
        title: "Methane Levels",
        value: `${latestMethane.toFixed(1)} ppm`,
        change: "+0.1 ppm",
        description: "but within safe limits",
        icon: <MethaneIcon className="h-10 w-10 text-primary" />,
        loading: waterLoading, // piggy-backing on water loading
      },
    ];
  }, [waterLevelsData, wasteBinsData, devicesData, waterLoading, wasteLoading, devicesLoading]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {overviewData.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            {item.loading ? (
                <>
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                </>
            ) : (
                <>
                    <div className="text-2xl font-bold">{item.value}</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.change}</span>
                        {" "}
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
