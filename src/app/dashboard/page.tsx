
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, BarChart, CheckCircle, Droplet, Plus, Server, Settings, Trash2, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { useUser } from "@/firebase";
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
  const path = user ? `users/${user.uid}/devices` : "";
  const { data: devices, loading } = useRtdbValue(path);

  const { deviceList, summary } = React.useMemo(() => {
    if (!devices) return { deviceList: [], summary: { total: 0, active: 0, warnings: 0, criticalWater: 0, criticalWaste: 0 } };
    
    const deviceKeys = Object.keys(devices);
    const deviceList = deviceKeys.map(key => ({ ...devices[key], key }));

    let criticalWater = 0;
    let criticalWaste = 0;

    deviceList.forEach(device => {
      const waterThreshold = device.thresholds?.waterLevel ?? 80;
      const binThreshold = device.thresholds?.binFullness ?? 80;

      if (device.waterLevelHistory) {
        const latestWater = Object.values(device.waterLevelHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime())[0];
        if (latestWater && latestWater.level >= waterThreshold) {
          criticalWater++;
        }
      }

      if (device.wasteBinHistory) {
        const latestWaste = Object.values(device.wasteBinHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime())[0];
        if (latestWaste && latestWaste.fullness >= binThreshold) {
          criticalWaste++;
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

    return { deviceList, summary };
  }, [devices]);


  const quickActions = [
    {
      title: "Add Device",
      icon: <AddDeviceIcon className="w-8 h-8 text-primary" />,
      href: "#"
    },
    {
      title: "Water Levels",
      icon: <WaterLevelIcon className="w-8 h-8 text-primary" />,
      href: "#"
    },
    {
      title: "Waste Bins",
      icon: <WasteBinIcon className="w-8 h-8 text-primary" />,
      href: "#"
    },
    {
      title: "Settings",
      icon: <SettingsIcon className="w-8 h-8 text-primary" />,
      href: "#"
    }
  ];

  const systemOverviewCards = [
    {
      title: "Total Devices",
      value: summary.total,
      icon: <BarChart className="text-primary" />,
      details: [
        { label: "active", value: summary.active },
        { label: "with warnings", value: summary.warnings, className: "text-warning" }
      ],
      iconBg: <BarChart className="w-12 h-12 text-primary/10" />,
      borderColor: "border-primary/50"
    },
    {
      title: "Critical Water Levels",
      value: summary.criticalWater,
      icon: <Droplet className="text-warning" />,
      details: [
        { label: "Warning levels detected", value: "", className: "text-warning" },
        { label: "devices need attention", value: summary.criticalWater }
      ],
      iconBg: <Droplet className="w-12 h-12 text-warning/10" />,
      borderColor: "border-warning/50",
      bgColor: "bg-warning/10"
    },
    {
      title: "Critical Waste Bins",
      value: summary.criticalWaste,
      icon: <Trash2 className="text-warning" />,
      details: summary.criticalWaste > 0 ?
        [{ label: "bins are full", value: summary.criticalWaste, className: "text-warning" }] :
        [{ label: "All normal", value: "", className: "text-muted-foreground" }],
      iconBg: <Trash2 className="w-12 h-12 text-warning/10" />,
      borderColor: "border-warning/50",
      bgColor: "bg-warning/10"
    },
    {
      title: "System Health",
      value: "All Systems Normal",
      icon: <CheckCircle className="text-success" />,
      details: [{ label: "Network status: online", value: "", className: "text-muted-foreground" }],
      iconBg: <CheckCircle className="w-12 h-12 text-success/10" />,
      borderColor: "border-success/50",
      bgColor: "bg-success/10"
    },
  ];

  return (
    <div className="flex flex-col gap-6">

        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">System Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">Real-time monitoring and analytics</p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Time Period:</p>
                    <Button variant="default" size="sm" className="h-8">Hourly</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">Daily</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">Weekly</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">Monthly</Button>
                </div>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {systemOverviewCards.map((card, index) => (
                <Card key={index} className={cn("flex flex-col justify-between overflow-hidden border-l-4", card.borderColor, card.bgColor)}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="flex items-center gap-2">
                             {card.icon}
                            <h3 className="font-semibold">{card.title}</h3>
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="absolute right-4 top-0">{card.iconBg}</div>
                        {typeof card.value === 'number' ? (
                             <p className="text-4xl font-bold">{card.value}</p>
                        ) : (
                            <p className="text-lg font-bold">{card.value}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                            {card.details.map((detail, i) => (
                                <p key={i} className={cn(detail.className)}>
                                    <span className="font-bold">{detail.value}</span> {detail.label}
                                </p>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

      <div>
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {quickActions.map(action => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <Button variant="ghost" className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                  {action.icon}
                  <span className="text-sm font-medium">{action.title}</span>
              </Button>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold">Device Overview</h2>
          <Button variant="ghost" size="sm" className="bg-primary/10 text-primary rounded-full h-8 px-4">All Devices</Button>
          <Button variant="ghost" size="sm" className="rounded-full h-8 px-4">Alerts ({summary.warnings})</Button>
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
