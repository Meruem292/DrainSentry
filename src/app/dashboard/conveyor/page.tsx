
"use client";

import React from "react";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { useUser, useDatabase } from "@/firebase";
import { ref, update } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ConveyorCard from "./components/conveyor-card";

export default function ConveyorPage() {
  const { user } = useUser();
  const { database } = useDatabase();
  const devicesPath = user ? `users/${user.uid}/devices` : "";
  const { data: devices, loading } = useRtdbValue(devicesPath);
  const { toast } = useToast();

  const deviceList = React.useMemo(() => {
    if (!devices) return [];
    return Object.keys(devices)
      .map(key => ({
        id: key,
        ...devices[key],
      }))
      .filter(device => device.hasOwnProperty('manualConveyor'));
  }, [devices]);

  const handleToggleConveyor = (deviceId: string, currentState: boolean) => {
    if (!user || !database) return;
    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    update(deviceRef, { manualConveyor: !currentState })
      .then(() => {
        toast({
          title: `Conveyor ${!currentState ? "activated" : "deactivated"}`,
          description: `The conveyor for device ${deviceId} has been turned ${!currentState ? "ON" : "OFF"}.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Operation Failed",
          description: error.message,
        });
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">Manual conveyor operation for each device</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : deviceList.length > 0 ? (
          deviceList.map((device) => (
            <ConveyorCard
              key={device.id}
              device={device}
              onToggle={() => handleToggleConveyor(device.id, device.manualConveyor)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No devices with conveyor control found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
