import { useState, useEffect } from "react";
import {
  ref,
  onValue,
  query,
  limitToLast,
  orderByKey,
} from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
} from "recharts";
import {
  Droplet,
  Trash,
  Scale,
  CalendarClock,
  MapPin,
  Clock,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import { Device, WaterLevel, WasteBin } from "@/types";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useWasteBinHistory } from "@/hooks/useHistoryData";
import { ref as dbRef, onValue as onDbValue } from "firebase/database";

export default function WasteBins() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [waterLevels, setWaterLevels] = useState<Record<string, WaterLevel>>(
    {}
  );
  const [wasteBins, setWasteBins] = useState<Record<string, WasteBin>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  // Store all device histories
  const [allWasteHistories, setAllWasteHistories] = useState<
    Record<
      string,
      Array<{ timestamp: string; fullness: number; weight: number }>
    >
  >({});

  // Debug function to log history data
  useEffect(() => {
    console.log("Current history data:", allWasteHistories);
    console.log("Current devices:", devices);
  }, [allWasteHistories, devices]);
  // Get history data for the selected device (for chart)
  const { history: wasteHistory, loading: historyLoading } = useWasteBinHistory(
    selectedDeviceId || ""
  );

  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    const waterLevelsRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteBinsRef = ref(database, `users/${user.uid}/wasteBins`);
    const historyUnsubscribes: Array<() => void> = [];

    // Get all devices and their histories
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

        // Set the first device as selected for charts if none is selected
        if (deviceList.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(deviceList[0].id);
        }

        // Clear previous history subscriptions
        historyUnsubscribes.forEach((unsub) => unsub());
        historyUnsubscribes.length = 0;

        // Subscribe to each device's waste bin history
        deviceList.forEach((device) => {
          const historyRef = ref(
            database,
            `users/${user.uid}/devices/${device.firebaseKey}/wasteBinHistory`
          );
          const unsub = onValue(historyRef, (historySnapshot) => {
            const historyData = historySnapshot.val();
            if (historyData) {
              const formattedHistory = Object.entries(historyData).map(
                ([timestamp, data]: [string, any]) => ({
                  timestamp,
                  fullness:
                    typeof data.fullness === "number" ? data.fullness : 0,
                  weight: typeof data.weight === "number" ? data.weight : 0,
                })
              );

              setAllWasteHistories((prev) => ({
                ...prev,
                [device.firebaseKey]: formattedHistory,
              }));
              console.log(`History for ${device.name}:`, formattedHistory);
            } else {
              setAllWasteHistories((prev) => ({
                ...prev,
                [device.firebaseKey]: [],
              }));
            }
          });
          historyUnsubscribes.push(unsub);
        });
      } else {
        setDevices([]);
        setAllWasteHistories({});
      }
      setLoading(false);
    });

    // Get all water level data
    const waterLevelsUnsubscribe = onValue(waterLevelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setWaterLevels(data);
      } else {
        setWaterLevels({});
      }
    });

    // Get all waste bin data
    const wasteBinsUnsubscribe = onValue(wasteBinsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setWasteBins(data);
      } else {
        setWasteBins({});
      }
    });

    return () => {
      devicesUnsubscribe();
      waterLevelsUnsubscribe();
      wasteBinsUnsubscribe();
      historyUnsubscribes.forEach((unsub) => unsub());
    };
  }, [user, selectedDeviceId]);

  // Helper functions for water level
  function getWaterLevelColor(level: number): string {
    if (level > 85) return "bg-destructive";
    if (level > 65) return "bg-warning";
    return "bg-success";
  }

  function getWaterLevelTextColor(level: number): string {
    if (level > 85) return "text-destructive";
    if (level > 65) return "text-warning";
    return "text-success";
  }

  function getWaterLevelStatus(level: number): string {
    if (level > 85) return "Critical";
    if (level > 65) return "Warning";
    return "Normal";
  }

  // Helper functions for bin fullness
  function getBinFullnessColor(fullness: number): string {
    if (fullness > 85) return "bg-destructive";
    if (fullness > 60) return "bg-warning";
    return "bg-success";
  }

  function getBinTextColor(fullness: number): string {
    if (fullness > 85) return "text-destructive";
    if (fullness > 60) return "text-warning";
    return "text-success";
  }

  function getBinStatus(fullness: number): string {
    if (fullness > 85) return "Critical";
    if (fullness > 60) return "Warning";
    return "Normal";
  }

  // Calculate active devices based on recent data updates (last 5 minutes)
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

  // Debug logging
  useEffect(() => {
    console.log("Devices:", devices);
    console.log("All Waste Histories:", allWasteHistories);

    // Log latest values from each device's history
    devices.forEach((device) => {
      const history = allWasteHistories[device.firebaseKey] || [];
      if (history.length > 0) {
        const latest = history.reduce((a, b) =>
          new Date(a.timestamp) > new Date(b.timestamp) ? a : b
        );
        console.log(`Latest data for ${device.name}:`, latest);
      }
    });
  }, [devices, allWasteHistories]);

  // Format history data for charts
  function formatWasteBinHistoryData(history: any[]) {
    if (!history || history.length === 0) {
      return [];
    }

    // Take the last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentHistory = history.filter(
      (item) => new Date(item.timestamp) >= sevenDaysAgo
    );

    return recentHistory.map((item) => ({
      date: new Date(item.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullness: item.fullness || 0,
      weight: item.weight || 0,
    }));
  }

  const chartData = formatWasteBinHistoryData(wasteHistory);

  // Calculate average bin fullness and weight using only the latest history values
  function getLatestHistoryValueFromAll(
    deviceFirebaseKey: string,
    key: "fullness" | "weight"
  ) {
    const deviceHistory = allWasteHistories[deviceFirebaseKey] || [];
    if (deviceHistory.length > 0) {
      // Sort by timestamp descending and get the latest
      const latest = deviceHistory.reduce((a, b) =>
        new Date(a.timestamp) > new Date(b.timestamp) ? a : b
      );
      return typeof latest[key] === "number" ? latest[key] : 0;
    }
    return 0;
  }

  // Get all valid latest history values
  const binFullnessValues = devices
    .map((d) => getLatestHistoryValueFromAll(d.firebaseKey, "fullness"))
    .filter((v) => typeof v === "number");

  const binWeightValues = devices
    .map((d) => getLatestHistoryValueFromAll(d.firebaseKey, "weight"))
    .filter((v) => typeof v === "number");

  // Calculate averages using only history values
  const averageBinFullness =
    binFullnessValues.length > 0
      ? Math.round(
          binFullnessValues.reduce((sum, val) => sum + val, 0) /
            binFullnessValues.length
        )
      : 0;

  const averageBinWeight =
    binWeightValues.length > 0
      ? Math.round(
          binWeightValues.reduce((sum, val) => sum + val, 0) /
            binWeightValues.length
        )
      : 0;

  return (
    <DashboardLayout
      title="Waste Management"
      subtitle="Real-time waste bin analytics"
    >
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-800">
          Waste Bin Analysis
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor waste bin fullness and weight across all your connected
          devices
        </p>
      </div>

      {/* Waste bin overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Total Monitored Bins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{devices.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {
                devices.filter((d) => {
                  const history = allWasteHistories[d.firebaseKey];
                  if (!history || history.length === 0) return false;
                  const latestEntry = history.reduce((a, b) =>
                    new Date(a.timestamp) > new Date(b.timestamp) ? a : b
                  );
                  const lastUpdated = latestEntry
                    ? new Date(latestEntry.timestamp)
                    : null;
                  return lastUpdated && lastUpdated >= fiveMinutesAgo;
                }).length
              }{" "}
              active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Average Bin Fullness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageBinFullness}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  averageBinFullness > 85
                    ? "bg-destructive"
                    : averageBinFullness > 60
                    ? "bg-warning"
                    : "bg-success"
                }`}
                style={{ width: `${averageBinFullness}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Average Bin Weight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageBinWeight} kg</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{
                  width: `${Math.min((averageBinWeight / 100) * 100, 100)}%`,
                }}
              ></div>
            </div>
            {/* {Math.round((averageBinWeight / 100) * 100)}% of capacity (100kg)   */}
            <p className="text-xs text-gray-500 mt-1">
              {Math.round((averageBinWeight / 10000) * 100)}% of capacity (10kg)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Selector for Charts */}
      {devices.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Select device for charts:
            </span>
            <Select
              value={selectedDeviceId || ""}
              onValueChange={setSelectedDeviceId}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name} - {device.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Waste bin charts */}
      {devices.length > 0 && selectedDeviceId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Bin Fullness Trends
              </CardTitle>
              <CardDescription>7-day bin fullness history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {historyLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Loading chart data...</p>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No historical data available
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip
                        formatter={(value: any) => [
                          `${value}%`,
                          "Bin Fullness",
                        ]}
                      />
                      <Bar
                        dataKey="fullness"
                        name="Bin Fullness"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                        fill="#10b981"
                      />
                      <Legend />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Bin Weight Trends
              </CardTitle>
              <CardDescription>7-day waste weight history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {historyLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Loading chart data...</p>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No historical data available
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip
                        formatter={(value: any) => [
                          `${value} kg`,
                          "Bin Weight",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        name="Weight (kg)"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
