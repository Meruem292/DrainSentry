
"use client";

import React from "react";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import DeviceRow from "./components/device-row";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DevicesPage() {
  const { user } = useUser();
  const path = user ? `users/${user.uid}/devices` : "";
  const { data: devices, loading } = useRtdbValue(path);

  const deviceList = React.useMemo(() => {
    if (!devices) return [];
    return Object.keys(devices).map(key => ({
      id: key,
      ...devices[key],
    }));
  }, [devices]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Manage your connected DrainSentry devices</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold">Connected Devices</h3>
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Device
            </Button>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-4 p-4 font-semibold text-sm text-muted-foreground border-b">
                    <div className="col-span-2">Device</div>
                    <div className="col-span-1">Device ID</div>
                    <div className="col-span-2">Location</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-center">Water Level</div>
                    <div className="col-span-1 text-center">Bin Fullness</div>
                    <div className="col-span-1 text-center">Weight</div>
                    <div className="col-span-1">Last Updated</div>
                    <div className="col-span-2 text-center">Actions</div>
                </div>
                {loading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : deviceList.length > 0 ? (
                    deviceList.map(device => (
                        <DeviceRow key={device.id} device={device} />
                    ))
                ) : (
                    <div className="text-center p-8 text-muted-foreground">
                        No devices found.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
