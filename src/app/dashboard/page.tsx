
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


export default function DashboardPage() {

  const { user } = useUser();
  const path = user ? `users/${user.uid}/devices` : "";
  const { data: devices, loading } = useRtdbValue(path);

  const deviceList = React.useMemo(() => {
    if (!devices) return [];
    return Object.keys(devices).map(key => ({ ...devices[key], key }));
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

  return (
    <div className="flex flex-col gap-6">
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
          <Button variant="ghost" size="sm" className="rounded-full h-8 px-4">Alerts (0)</Button>
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
