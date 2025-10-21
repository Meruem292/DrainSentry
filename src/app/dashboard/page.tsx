"use client";

import React from "react";
import { useUser } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { Skeleton } from "@/components/ui/skeleton";
import DeviceCard from "./components/device-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const path = user ? `users/${user.uid}/devices` : "";
  const { data: devices, loading } = useRtdbValue(path);

  const deviceList = React.useMemo(() => {
    if (!devices) return [];
    return Object.entries(devices).map(([key, value]) => ({
        id: key,
        ...(value as any),
    }));
  }, [devices]);

  return (
    <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold tracking-tight">Your Devices</h1>
        {loading ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                ))}
            </div>
        ) : deviceList.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {deviceList.map((device) => (
                    <DeviceCard key={device.id} device={device} />
                ))}
            </div>
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No Devices Found</AlertTitle>
                <AlertDescription>
                    There are no monitoring devices registered to your account yet.
                </AlertDescription>
            </Alert>
        )}
    </div>
  );
}
