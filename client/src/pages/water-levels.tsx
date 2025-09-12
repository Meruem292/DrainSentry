import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Droplet, BarChart2, ChevronRight } from "lucide-react";
import { Device, WaterLevel, WasteBin } from "@/types";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

export default function WaterLevels() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceLatestValues, setDeviceLatestValues] = useState<
    Record<
      string,
      {
        waterLevel: number;
        binFullness: number;
        binWeight: number;
        waterTimestamp: string;
        binTimestamp: string;
      }
    >
  >({});
  const [loading, setLoading] = useState(true);

  // Helper function to get the latest values from history
  const getLatestValues = (
    waterHistory: Record<string, any> | null | undefined,
    wasteHistory: Record<string, any> | null | undefined
  ) => {
    const result = {
      waterLevel: 0,
      binFullness: 0,
      binWeight: 0,
      waterTimestamp: "",
      binTimestamp: "",
    };

    if (waterHistory) {
      const waterEntries = Object.entries(waterHistory);
      if (waterEntries.length > 0) {
        const [timestamp, value] = waterEntries.sort(
          (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
        )[0];
        result.waterLevel = value.level || 0;
        result.waterTimestamp = timestamp;
      }
    }

    if (wasteHistory) {
      const wasteEntries = Object.entries(wasteHistory);
      if (wasteEntries.length > 0) {
        const [timestamp, value] = wasteEntries.sort(
          (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
        )[0];
        result.binFullness = value.fullness || 0;
        result.binWeight = value.weight || 0;
        result.binTimestamp = timestamp;
      }
    }

    return result;
  };

  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    const historyUnsubscribes: Array<() => void> = [];

    // Get all devices
    const devicesUnsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceList = Object.entries(data).map(
          ([key, device]: [string, any]) => ({
            firebaseKey: key,
            id: device.id,
            name: device.name,
            location: device.location,
            status: device.status,
            lastSeen: device.lastSeen,
            ...device,
          })
        );
        setDevices(deviceList);

        // Clear previous history subscriptions
        historyUnsubscribes.forEach((unsub) => unsub());
        historyUnsubscribes.length = 0;

        // Subscribe to each device's history (both water and waste)
        deviceList.forEach((device) => {
          const waterHistoryRef = ref(
            database,
            `users/${user.uid}/devices/${device.firebaseKey}/waterLevelHistory`
          );
          const wasteBinHistoryRef = ref(
            database,
            `users/${user.uid}/devices/${device.firebaseKey}/wasteBinHistory`
          );

          const unsubWater = onValue(waterHistoryRef, (waterSnapshot) => {
            const waterData = waterSnapshot.val();
            const wasteHistoryRef = ref(
              database,
              `users/${user.uid}/devices/${device.firebaseKey}/wasteBinHistory`
            );

            // Get waste bin data
            onValue(wasteHistoryRef, (wasteSnapshot) => {
              const wasteData = wasteSnapshot.val();
              const latestValues = getLatestValues(waterData, wasteData);

              setDeviceLatestValues((prev) => ({
                ...prev,
                [device.firebaseKey]: latestValues,
              }));
            });
          });

          historyUnsubscribes.push(unsubWater);
        });
      } else {
        setDevices([]);
        setDeviceLatestValues({});
      }
      setLoading(false);
    });

    return () => {
      devicesUnsubscribe();
      historyUnsubscribes.forEach((unsub) => unsub());
    };
  }, [user]);

  // Helper functions for water level
  function getWaterLevelColor(level: number): string {
    if (level > 65) return "bg-destructive";
    if (level > 45) return "bg-warning";
    return "bg-success";
  }

  function getWaterLevelTextColor(level: number): string {
    if (level > 65) return "text-destructive";
    if (level > 45) return "text-warning";
    return "text-success";
  }

  function getWaterLevelStatus(level: number): string {
    if (level > 65) return "Critical";
    if (level > 45) return "Warning";
    return "Normal";
  }

  function getBinFullnessColor(fullness: number): string {
    if (fullness > 60) return "bg-destructive";
    if (fullness > 44) return "bg-warning";
    return "bg-success";
  }

  function getBinStatus(fullness: number): string {
    if (fullness > 60) return "Critical";
    if (fullness > 44) return "Warning";
    return "Normal";
  }

  // Calculate active devices based on recent data updates (last 5 minutes)
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

  // Calculate average of water levels across all devices using history data
  const waterLevelValues = Object.values(deviceLatestValues).map(
    (v) => v.waterLevel
  );
  const averageWaterLevel =
    waterLevelValues.length > 0
      ? Math.round(
          waterLevelValues.reduce((sum, level) => sum + level, 0) /
            waterLevelValues.length
        )
      : 0;

  // Calculate number of critical stations using history data (level > 65)
  const criticalStations = waterLevelValues.filter(
    (level) => level > 65
  ).length;

  return (
    <DashboardLayout
      title="Water Level Monitoring"
      subtitle="Real-time sewer water level analytics"
    >
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-800">
          Water Level Analysis
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor sewer water levels across all your connected devices
        </p>
      </div>

      {/* Water level overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Total Monitoring Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{devices.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {
                devices.filter((d) => {
                  const lastValue = deviceLatestValues[d.firebaseKey];
                  const lastWaterUpdate = lastValue?.waterTimestamp
                    ? new Date(lastValue.waterTimestamp)
                    : null;
                  const lastBinUpdate = lastValue?.binTimestamp
                    ? new Date(lastValue.binTimestamp)
                    : null;

                  return (
                    (lastWaterUpdate && lastWaterUpdate >= fiveMinutesAgo) ||
                    (lastBinUpdate && lastBinUpdate >= fiveMinutesAgo)
                  );
                }).length
              }{" "}
              active
            </p>
          </CardContent>
        </Card>

        <Card
          className={`animated-card slide-in hover-scale ${
            averageWaterLevel > 65
              ? "danger-card"
              : averageWaterLevel > 45
              ? "warning-card"
              : "success-card"
          }`}
          style={{ animationDelay: "0.05s" }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Average Water Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                averageWaterLevel > 65
                  ? "text-destructive"
                  : averageWaterLevel > 45
                  ? "text-warning"
                  : "text-success"
              }`}
            >
              {waterLevelValues.length > 0
                ? `${averageWaterLevel}%`
                : "No data"}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  averageWaterLevel > 65
                    ? "bg-destructive"
                    : averageWaterLevel > 45
                    ? "bg-warning"
                    : "bg-success"
                }`}
                style={{
                  width: `${averageWaterLevel}%`,
                  transition: "width 0.5s ease-in-out",
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`animated-card slide-in ${
            criticalStations > 0 ? "danger-card" : "success-card"
          }`}
          style={{ animationDelay: "0.1s" }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Critical Stations
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div
              className={`text-3xl font-bold ${
                criticalStations > 0 ? "text-destructive" : "text-success"
              }`}
            >
              {waterLevelValues.length > 0 ? criticalStations : "No data"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {criticalStations > 0 ? (
                <span className="text-destructive">Requires attention</span>
              ) : waterLevelValues.length > 0 ? (
                "All normal"
              ) : (
                "No data"
              )}
            </p>
            {criticalStations > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 pulse-animation"></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* No quick actions needed as they are accessible through the sidebar */}
    </DashboardLayout>
  );
}
