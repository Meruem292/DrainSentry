
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Droplet, Plus, Server, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import DeviceOverviewCard from "./components/device-overview-card";
import AddDeviceIcon from "@/components/icons/add-device-icon";
import WasteBinIcon from "@/components/icons/waste-bin-icon";
import WaterLevelIcon from "@/components/icons/water-level-icon";
import SettingsIcon from "@/components/icons/settings-icon";


const parseTimestamp = (timestamp: string): Date => {
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(0);
    // new Date(year, monthIndex, day, hours, minutes, seconds)
    return new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
};


export default function DashboardPage() {

  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const path = user ? `users/${user.uid}/devices` : "";
  const { data: devices, loading } = useRtdbValue(path);

  const { deviceList, summary, firstCriticalWaterDevice, firstCriticalWasteDevice } = React.useMemo(() => {
    if (!devices) return { deviceList: [], summary: { total: 0, active: 0, warnings: 0, criticalWater: 0, criticalWaste: 0 }, firstCriticalWaterDevice: null, firstCriticalWasteDevice: null };
    
    const deviceKeys = Object.keys(devices);
    const deviceList = deviceKeys.map(key => ({ ...devices[key], key }));

    let criticalWater = 0;
    let criticalWaste = 0;
    let firstCriticalWaterDevice: string | null = null;
    let firstCriticalWasteDevice: string | null = null;

    deviceList.forEach(device => {
      const waterThreshold = device.thresholds?.waterLevel ?? 80;
      const binThreshold = device.thresholds?.binFullness ?? 80;

      if (device.waterLevelHistory) {
        const latestWater = Object.values(device.waterLevelHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime())[0];
        if (latestWater && latestWater.level >= waterThreshold) {
          criticalWater++;
          if (!firstCriticalWaterDevice) firstCriticalWaterDevice = device.key;
        }
      }

      if (device.wasteBinHistory) {
        const latestWaste = Object.values(device.wasteBinHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime())[0];
        if (latestWaste && latestWaste.filled >= binThreshold) {
          criticalWaste++;
          if (!firstCriticalWasteDevice) firstCriticalWasteDevice = device.key;
        }
      }
    });

    const summary = {
      total: deviceList.length,
      active: deviceList.filter(d => d.status === 'active').length,
      warnings: criticalWater + criticalWaste,
      criticalWater,
      criticalWaste,
    };

    return { deviceList, summary, firstCriticalWaterDevice, firstCriticalWasteDevice };
  }, [devices]);

  const handleCardClick = (type: 'water' | 'waste') => {
    if (type === 'water') {
      if (firstCriticalWaterDevice) {
        router.push(`/dashboard/devices/${firstCriticalWaterDevice}`);
      } else {
        toast({ title: "All Good!", description: "No critical water levels detected." });
      }
    } else if (type === 'waste') {
      if (firstCriticalWasteDevice) {
        router.push(`/dashboard/devices/${firstCriticalWasteDevice}`);
      } else {
        toast({ title: "All Good!", description: "No critical waste bins detected." });
      }
    }
  };


  const systemOverviewCards = [
    {
      title: "Total Devices",
      value: summary.total,
      icon: <Server className="text-primary" />,
      details: [
        { label: "active", value: summary.active },
        { label: "with warnings", value: summary.warnings, className: "text-warning" }
      ],
      iconBg: <Server className="w-12 h-12 text-primary/10" />,
      borderColor: "border-primary",
      bgColor: "bg-primary/5"
    },
    {
      title: "Critical Water Levels",
      value: summary.criticalWater,
      valueColor: summary.criticalWater > 0 ? "text-warning" : "text-foreground",
      icon: <Droplet className={cn(summary.criticalWater > 0 ? "text-warning" : "text-primary")} />,
      details: summary.criticalWater > 0 ?
        [
          { label: "devices need attention", value: summary.criticalWater, className: "text-warning" }
        ] :
        [{ label: "All levels normal", value: "", className: "text-muted-foreground" }],
      iconBg: <Droplet className={cn("w-12 h-12", summary.criticalWater > 0 ? "text-warning/10" : "text-primary/10")} />,
      borderColor: summary.criticalWater > 0 ? "border-warning" : "border-primary",
      bgColor: summary.criticalWater > 0 ? "bg-warning/5" : "bg-primary/5",
      onClick: () => handleCardClick('water')
    },
    {
      title: "Critical Waste Bins",
      value: summary.criticalWaste,
      valueColor: summary.criticalWaste > 0 ? "text-warning" : "text-foreground",
      icon: <Trash2 className={cn(summary.criticalWaste > 0 ? "text-warning" : "text-accent")} />,
      details: summary.criticalWaste > 0 ?
        [{ label: "bins are full", value: summary.criticalWaste, className: "text-warning" }] :
        [{ label: "All bins normal", value: "", className: "text-muted-foreground" }],
      iconBg: <Trash2 className={cn("w-12 h-12", summary.criticalWaste > 0 ? "text-warning/10" : "text-accent/10")} />,
      borderColor: summary.criticalWaste > 0 ? "border-warning" : "border-accent",
      bgColor: summary.criticalWaste > 0 ? "bg-warning/5" : "bg-accent/5",
      onClick: () => handleCardClick('waste')
    },
    {
      title: "System Health",
      value: "All Systems Normal",
      valueColor: "text-success",
      icon: <CheckCircle className="text-success" />,
      details: [{ label: "Network status: online", value: "", className: "text-muted-foreground" }],
      iconBg: <CheckCircle className="w-12 h-12 text-success/10" />,
      borderColor: "border-success",
      bgColor: "bg-success/5"
    },
  ];

  return (
    <div className="flex flex-col gap-6">

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {systemOverviewCards.map((card, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    "flex flex-col justify-between overflow-hidden border-l-4", 
                    card.borderColor, 
                    card.bgColor,
                    card.onClick && "cursor-pointer hover:shadow-md transition-shadow"
                  )}
                  onClick={card.onClick}
                >
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="flex items-center gap-2">
                             {card.icon}
                            <h3 className="font-semibold">{card.title}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="absolute right-4 top-0">{card.iconBg}</div>
                        {typeof card.value === 'number' ? (
                             <p className={cn("text-4xl font-bold", card.valueColor)}>{card.value}</p>
                        ) : (
                            <p className={cn("text-lg font-bold", card.valueColor)}>{card.value}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                            {card.details.map((detail, i) => (
                                <p key={i} className={detail.className}>
                                    <span className="font-bold">{detail.value}</span> {detail.label}
                                </p>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

      <div className="mt-4">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold">Device Overview</h2>
          <Link href="/dashboard/devices">
            <Button variant="ghost" size="sm" className="bg-primary/10 text-primary rounded-full h-8 px-4">All Devices</Button>
          </Link>
          {summary.warnings > 0 && (
            <Button variant="ghost" size="sm" className="rounded-full h-8 px-4 bg-warning/10 text-warning-foreground">Alerts ({summary.warnings})</Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-lg bg-muted-foreground/10" />
            <div className="h-64 animate-pulse rounded-lg bg-muted-foreground/10" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {deviceList.length > 0 ? (
              deviceList.map(device => (
                <DeviceOverviewCard key={device.key} device={device} />
              ))
            ) : (
              <p className="text-muted-foreground col-span-full text-center">No devices found.</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
