import { useEffect, useState } from "react";
import { ref, onValue, get } from "firebase/database";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InfoIcon,
  Droplet,
  Trash2,
  BadgeAlert,
  Info,
  Activity,
  Scale,
  CalendarClock,
  MapPin,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Plus,
  BarChart2,
  BarChart as History,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WaterLevel, WasteBin, Device } from "@/types";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  useWaterLevelHistory,
  useWasteBinHistory,
} from "@/hooks/useHistoryData";
import { ref as dbRef, onValue as onDbValue } from "firebase/database";

export default function Dashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [waterData, setWaterData] = useState<Record<string, WaterLevel>>({});
  const [wasteData, setWasteData] = useState<Record<string, WasteBin>>({});
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<
    "hour" | "day" | "week" | "month"
  >("hour");
  const [chartDeviceId, setChartDeviceId] = useState<string | null>(null);
  // Store all device histories
  const [allWaterHistories, setAllWaterHistories] = useState<
    Record<string, any[]>
  >({});
  const [allWasteHistories, setAllWasteHistories] = useState<
    Record<string, any[]>
  >({});
  const [deviceLatestValues, setDeviceLatestValues] = useState<
    Record<
      string,
      {
        waterLevel?: number;
        binFullness?: number;
        binWeight?: number;
        lastWaterUpdate?: string;
        lastBinUpdate?: string;
      }
    >
  >({});

  // Helper function for water level color
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

  // Helper function for bin fullness color
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

  // Helper to get latest value from history
  const getLatestHistoryValue = (history: any[] | undefined) => {
    if (!history || history.length === 0) return undefined;

    // Convert history items to ensure they have proper timestamp
    const validEntries = history.filter((entry) => {
      // Check if timestamp exists and is valid
      const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
      return timestamp && !isNaN(timestamp.getTime());
    });

    if (validEntries.length === 0) return undefined;

    // Sort by timestamp in descending order and take the first item
    return validEntries.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    })[0];
  };

  // Calculate real-time statistics from history data
  const updateDeviceStatistics = (
    deviceKey: string,
    waterHistory: any[],
    wasteHistory: any[]
  ) => {
    // Get latest water level entry
    const latestWater = getLatestHistoryValue(waterHistory);
    const latestWaste = getLatestHistoryValue(wasteHistory);

    // Extract values, handling different data structures
    const waterLevel = latestWater
      ? typeof latestWater.level !== "undefined"
        ? latestWater.level
        : typeof latestWater.value !== "undefined"
        ? latestWater.value
        : typeof latestWater.waterLevel !== "undefined"
        ? latestWater.waterLevel
        : 0
      : 0;

    const binFullness = latestWaste
      ? typeof latestWaste.fullness !== "undefined"
        ? latestWaste.fullness
        : typeof latestWaste.binFullness !== "undefined"
        ? latestWaste.binFullness
        : 0
      : 0;

    const binWeight = latestWaste
      ? typeof latestWaste.weight !== "undefined"
        ? latestWaste.weight
        : typeof latestWaste.binWeight !== "undefined"
        ? latestWaste.binWeight
        : 0
      : 0;

    setDeviceLatestValues((prev) => ({
      ...prev,
      [deviceKey]: {
        waterLevel: waterLevel,
        binFullness: binFullness,
        binWeight: binWeight,
        lastWaterUpdate: latestWater?.timestamp,
        lastBinUpdate: latestWaste?.timestamp,
      },
    }));
  };

  // Get history data
  const { history: waterHistory, loading: waterHistoryLoading } =
    useWaterLevelHistory(chartDeviceId || "");
  const { history: wasteHistory, loading: wasteHistoryLoading } =
    useWasteBinHistory(chartDeviceId || "");

  useEffect(() => {
    if (!user) return;

    const waterRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteRef = ref(database, `users/${user.uid}/wasteBins`);
    const devicesRef = ref(database, `users/${user.uid}/devices`);

    // Subscribe to water data
    const waterUnsubscribe = onValue(waterRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setWaterData(data);
      } else {
        setWaterData({});
      }
      setLoading(false);
    });

    // Subscribe to waste data
    const wasteUnsubscribe = onValue(wasteRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setWasteData(data);
      } else {
        setWasteData({});
      }
    });

    // Subscribe to devices data
    const devicesUnsubscribe = onValue(devicesRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceList = await Promise.all(
          Object.entries(data).map(async ([key, device]: [string, any]) => {
            // Fetch latest history entries for this device
            const waterHistoryRef = ref(
              database,
              `users/${user.uid}/devices/${key}/waterLevelHistory`
            );
            const wasteHistoryRef = ref(
              database,
              `users/${user.uid}/devices/${key}/wasteBinHistory`
            );

            try {
              const [waterSnap, wasteSnap] = await Promise.all([
                get(waterHistoryRef),
                get(wasteHistoryRef),
              ]);

              const waterHistory = waterSnap.exists()
                ? Object.entries(waterSnap.val()).map(
                    ([ts, val]: [string, any]) => ({
                      timestamp: ts,
                      ...val,
                    })
                  )
                : [];

              const wasteHistory = wasteSnap.exists()
                ? Object.entries(wasteSnap.val()).map(
                    ([ts, val]: [string, any]) => ({
                      timestamp: ts,
                      ...val,
                    })
                  )
                : [];

              // Update device statistics with latest values
              updateDeviceStatistics(key, waterHistory, wasteHistory);

              return {
                firebaseKey: key,
                id: device.id,
                name: device.name,
                location: device.location,
                status: device.status,
                lastSeen: device.lastSeen,
                ...device,
              };
            } catch (error) {
              console.error(`Error fetching history for device ${key}:`, error);
              return {
                firebaseKey: key,
                id: device.id,
                name: device.name,
                location: device.location,
                status: device.status,
                lastSeen: device.lastSeen,
                ...device,
              };
            }
          })
        );
        setDevices(deviceList);
        if (deviceList.length > 0 && !chartDeviceId) {
          setChartDeviceId(deviceList[0].id);
        }
        // Fetch all device histories for all devices
        let unsubscribes: Array<() => void> = [];
        const waterHistories: Record<string, any[]> = {};
        const wasteHistories: Record<string, any[]> = {};
        deviceList.forEach((device) => {
          const waterHistoryRef = dbRef(
            database,
            `users/${user.uid}/devices/${device.firebaseKey}/waterLevelHistory`
          );
          const wasteHistoryRef = dbRef(
            database,
            `users/${user.uid}/devices/${device.firebaseKey}/wasteBinHistory`
          );
          // Water
          const unsubWater = onDbValue(waterHistoryRef, (snap) => {
            const val = snap.val();
            if (val) {
              waterHistories[device.firebaseKey] = Object.values(val);
            } else {
              waterHistories[device.firebaseKey] = [];
            }
            setAllWaterHistories({ ...waterHistories });
          });
          unsubscribes.push(unsubWater);
          // Waste
          const unsubWaste = onDbValue(wasteHistoryRef, (snap) => {
            const val = snap.val();
            if (val) {
              wasteHistories[device.firebaseKey] = Object.values(val);
            } else {
              wasteHistories[device.firebaseKey] = [];
            }
            setAllWasteHistories({ ...wasteHistories });
          });
          unsubscribes.push(unsubWaste);
        });
      } else {
        setDevices([]);
      }
    });

    return () => {
      waterUnsubscribe();
      wasteUnsubscribe();
      devicesUnsubscribe();
    };
  }, [user, chartDeviceId]);

  const totalDevices = devices.length;

  // Calculate active devices and warning states based on recent data updates (last 1 minute)
  const oneMinuteAgo = new Date();
  oneMinuteAgo.setTime(oneMinuteAgo.getTime() - 60000); // 1 minute in milliseconds

  // Calculate device states and critical levels
  const deviceStatusInfo = devices.map((device) => {
    const latestValues = deviceLatestValues[device.firebaseKey];
    if (!latestValues) {
      return {
        isActive: false,
        hasWarning: false,
        hasCritical: false,
        waterLevel: 0,
        binFullness: 0,
      };
    }

    const lastWaterUpdate = latestValues.lastWaterUpdate
      ? new Date(latestValues.lastWaterUpdate)
      : null;
    const lastBinUpdate = latestValues.lastBinUpdate
      ? new Date(latestValues.lastBinUpdate)
      : null;

    const isActive = Boolean(
      (lastWaterUpdate && lastWaterUpdate >= oneMinuteAgo) ||
        (lastBinUpdate && lastBinUpdate >= oneMinuteAgo)
    );

    const waterLevel = latestValues.waterLevel || 0;
    const binFullness = latestValues.binFullness || 0;

    const hasWarning =
      (waterLevel > 65 && waterLevel <= 85) ||
      (binFullness > 60 && binFullness <= 85);
    const hasCritical = waterLevel > 85 || binFullness > 85;

    return {
      isActive,
      hasWarning,
      hasCritical,
      waterLevel,
      binFullness,
    };
  });

  const activeDevices = deviceStatusInfo.filter(
    (state) => state.isActive
  ).length;
  const warningDevices = deviceStatusInfo.filter(
    (state) => state.hasWarning
  ).length;
  const criticalDevices = deviceStatusInfo.filter(
    (state) => state.hasCritical
  ).length;

  // Calculate critical levels for specific metrics
  const criticalWaterLevels = deviceStatusInfo.filter(
    (state) => state.waterLevel > 85
  ).length;

  const criticalBins = deviceStatusInfo.filter(
    (state) => state.binFullness > 85
  ).length;

  // ...existing code...

  // Helper to get latest value from history
  function getLatestHistoryValueFromAll(
    histories: Record<string, any[]>,
    deviceKey: string,
    key: string
  ) {
    const deviceHistory = histories[deviceKey] || [];
    if (deviceHistory.length > 0) {
      const latest = deviceHistory.reduce((a, b) =>
        new Date(a.timestamp) > new Date(b.timestamp) ? a : b
      );
      return typeof latest[key] === "number" ? latest[key] : undefined;
    }
    return undefined;
  }

  // Calculate average water level and bin fullness/weight across all devices using latest history
  const waterLevelsArr = devices.map((d) => {
    const v = getLatestHistoryValueFromAll(
      allWaterHistories,
      d.firebaseKey,
      "level"
    );
    if (typeof v === "number") return v;
    const w = waterData[d.firebaseKey];
    return typeof w?.level === "number" ? w.level : 0;
  });
  const binFullnessArr = devices.map((d) => {
    const v = getLatestHistoryValueFromAll(
      allWasteHistories,
      d.firebaseKey,
      "fullness"
    );
    if (typeof v === "number") return v;
    const wb = wasteData[d.firebaseKey];
    return typeof wb?.fullness === "number" ? wb.fullness : 0;
  });
  const binWeightArr = devices.map((d) => {
    const v = getLatestHistoryValueFromAll(
      allWasteHistories,
      d.firebaseKey,
      "weight"
    );
    if (typeof v === "number") return v;
    const wb = wasteData[d.firebaseKey];
    return typeof wb?.weight === "number" ? wb.weight : 0;
  });
  const avgWaterLevel =
    waterLevelsArr.length > 0
      ? waterLevelsArr.reduce((a, b) => a + b, 0) / waterLevelsArr.length
      : 0;
  const avgBinFullness =
    binFullnessArr.length > 0
      ? binFullnessArr.reduce((a, b) => a + b, 0) / binFullnessArr.length
      : 0;
  const avgBinWeight =
    binWeightArr.length > 0
      ? binWeightArr.reduce((a, b) => a + b, 0) / binWeightArr.length
      : 0;

  // Critical if average exceeds threshold
  // Critical devices are calculated above from latest history values

  // Generate real data for charts from Firebase based on time filter
  function getFormattedData(type: "water" | "waste", history: any[]) {
    if (!history || history.length === 0) {
      return [];
    }

    const now = new Date();
    let data: any[] = [];

    switch (timeFilter) {
      case "hour": {
        // Filter data for the last 24 hours
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        data = history.filter(
          (item) => new Date(item.timestamp) >= last24Hours
        );
        return data.map((item) => ({
          name: new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: type === "water" ? item.level : item.fullness,
        }));
      }
      case "day": {
        // Filter data for the last 7 days
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        data = history.filter((item) => new Date(item.timestamp) >= last7Days);
        return data.map((item) => ({
          name: new Date(item.timestamp).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          }),
          value: type === "water" ? item.level : item.fullness,
        }));
      }
      case "week": {
        // Filter data for the last 4 weeks
        const last4Weeks = new Date(
          now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000
        );
        data = history.filter((item) => new Date(item.timestamp) >= last4Weeks);
        // Aggregate data by week (starting on Sunday)
        const weeklyData = data.reduce(
          (
            acc: Record<string, { name: string; values: number[] }>,
            item: any
          ) => {
            const weekStart = new Date(item.timestamp);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = weekStart.toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });
            if (!acc[weekKey]) {
              acc[weekKey] = { name: weekKey, values: [] };
            }
            acc[weekKey].values.push(
              type === "water" ? item.level : item.fullness
            );
            return acc;
          },
          {}
        );
        return Object.values(weeklyData).map(
          (week: { name: string; values: number[] }) => ({
            name: week.name,
            value: week.values.reduce((a, b) => a + b, 0) / week.values.length,
          })
        );
      }
      case "month": {
        // Filter data for the last 12 months
        const last12Months = new Date(now.getTime());
        last12Months.setMonth(last12Months.getMonth() - 12);
        data = history.filter(
          (item) => new Date(item.timestamp) >= last12Months
        );
        // Aggregate data by month
        const monthlyData = data.reduce(
          (
            acc: Record<string, { name: string; values: number[] }>,
            item: any
          ) => {
            const monthKey = new Date(item.timestamp).toLocaleDateString([], {
              year: "numeric",
              month: "short",
            });
            if (!acc[monthKey]) {
              acc[monthKey] = { name: monthKey, values: [] };
            }
            acc[monthKey].values.push(
              type === "water" ? item.level : item.fullness
            );
            return acc;
          },
          {}
        );
        return Object.values(monthlyData).map(
          (month: { name: string; values: number[] }) => ({
            name: month.name,
            value:
              month.values.reduce((a, b) => a + b, 0) / month.values.length,
          })
        );
      }
      default:
        return [];
    }
  }

  const waterChartData = getFormattedData("water", waterHistory);
  const wasteChartData = getFormattedData("waste", wasteHistory);

  return (
    <DashboardLayout title="Dashboard" subtitle="DrainSentry system overview">
      {/* Dashboard Header with Stats and Time Period Filter Controls */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              System Overview
            </h2>
            <p className="text-sm text-gray-500">
              Real-time monitoring and analytics
            </p>
          </div>

          <div className="flex items-center mt-3 sm:mt-0">
            <span className="text-sm font-medium text-gray-700 mr-2">
              Time Period:
            </span>
            <div className="flex items-center space-x-1 p-1 bg-gray-100 rounded-lg shadow-inner">
              <Button
                variant={timeFilter === "hour" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFilter("hour")}
                className={`text-xs ${
                  timeFilter === "hour" ? "shadow-sm" : ""
                }`}
              >
                Hourly
              </Button>
              <Button
                variant={timeFilter === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFilter("day")}
                className={`text-xs ${timeFilter === "day" ? "shadow-sm" : ""}`}
              >
                Daily
              </Button>
              <Button
                variant={timeFilter === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFilter("week")}
                className={`text-xs ${
                  timeFilter === "week" ? "shadow-sm" : ""
                }`}
              >
                Weekly
              </Button>
              <Button
                variant={timeFilter === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeFilter("month")}
                className={`text-xs ${
                  timeFilter === "month" ? "shadow-sm" : ""
                }`}
              >
                Monthly
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="animated-card hover-scale fade-in border-l-4 border-l-blue-500 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
            <CardTitle className="text-base font-medium flex items-center">
              <div className="bg-blue-100 p-1.5 rounded-md mr-2">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              Total Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold">{totalDevices}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span
                    className={
                      activeDevices > 0
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }
                  >
                    {activeDevices}
                  </span>{" "}
                  active
                </p>
                {warningDevices > 0 && (
                  <p className="text-sm text-orange-500 mt-1">
                    {warningDevices} with warnings
                  </p>
                )}
              </div>
              <div className="bg-blue-100 h-12 w-12 rounded-full flex items-center justify-center opacity-80">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`animated-card slide-in border-l-4 ${
            criticalWaterLevels > 0 ? "border-l-red-500" : "border-l-green-500"
          } overflow-hidden`}
          style={{ animationDelay: "0.05s" }}
        >
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
            <CardTitle className="text-base font-medium flex items-center">
              <div
                className={`${
                  criticalWaterLevels > 0 ? "bg-red-100" : "bg-green-100"
                } p-1.5 rounded-md mr-2`}
              >
                <Droplet
                  className={`h-4 w-4 ${
                    criticalWaterLevels > 0 ? "text-red-600" : "text-green-600"
                  }`}
                />
              </div>
              Critical Water Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex justify-between items-center">
              <div>
                <div
                  className={`text-3xl font-bold ${
                    criticalDevices > 0
                      ? "text-red-600"
                      : warningDevices > 0
                      ? "text-orange-500"
                      : "text-green-600"
                  }`}
                >
                  {criticalDevices}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {criticalDevices > 0 ? (
                    <span className="text-red-500 font-medium">
                      Critical levels detected
                    </span>
                  ) : warningDevices > 0 ? (
                    <span className="text-orange-500 font-medium">
                      Warning levels detected
                    </span>
                  ) : (
                    <span className="text-green-600">All normal</span>
                  )}
                </p>
                {warningDevices > 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    {warningDevices} devices need attention
                  </p>
                )}
              </div>
              <div
                className={`${
                  criticalWaterLevels > 0 ? "bg-red-100" : "bg-green-100"
                } h-12 w-12 rounded-full flex items-center justify-center opacity-80`}
              >
                <Droplet
                  className={`h-6 w-6 ${
                    criticalWaterLevels > 0 ? "text-red-600" : "text-green-600"
                  }`}
                />
              </div>
            </div>
            {criticalWaterLevels > 0 && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 pulse-animation"></div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`animated-card slide-in border-l-4 ${
            criticalBins > 0 ? "border-l-red-500" : "border-l-green-500"
          } overflow-hidden`}
          style={{ animationDelay: "0.1s" }}
        >
          <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-transparent">
            <CardTitle className="text-base font-medium flex items-center">
              <div
                className={`${
                  criticalBins > 0 ? "bg-red-100" : "bg-green-100"
                } p-1.5 rounded-md mr-2`}
              >
                <Trash2
                  className={`h-4 w-4 ${
                    criticalBins > 0 ? "text-red-600" : "text-green-600"
                  }`}
                />
              </div>
              Critical Waste Bins
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex justify-between items-center">
              <div>
                <div
                  className={`text-3xl font-bold ${
                    criticalBins > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {criticalBins}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {criticalBins > 0 ? (
                    <span className="text-red-500 font-medium">
                      Need emptying
                    </span>
                  ) : (
                    <span className="text-green-600">All normal</span>
                  )}
                </p>
              </div>
              <div
                className={`${
                  criticalBins > 0 ? "bg-red-100" : "bg-green-100"
                } h-12 w-12 rounded-full flex items-center justify-center opacity-80`}
              >
                <Trash2
                  className={`h-6 w-6 ${
                    criticalBins > 0 ? "text-red-600" : "text-green-600"
                  }`}
                />
              </div>
            </div>
            {criticalBins > 0 && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 pulse-animation"></div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`animated-card slide-in border-l-4 ${
            criticalWaterLevels + criticalBins > 0
              ? "border-l-orange-500"
              : "border-l-green-500"
          } overflow-hidden`}
          style={{ animationDelay: "0.15s" }}
        >
          <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-transparent">
            <CardTitle className="text-base font-medium flex items-center">
              <div
                className={`${
                  criticalWaterLevels + criticalBins > 0
                    ? "bg-orange-100"
                    : "bg-green-100"
                } p-1.5 rounded-md mr-2`}
              >
                {criticalWaterLevels + criticalBins > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                {criticalWaterLevels + criticalBins > 0 ? (
                  <>
                    <div className="text-lg font-medium text-orange-600">
                      Attention Required
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {criticalWaterLevels + criticalBins} issues need attention
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-medium text-green-600">
                      All Systems Normal
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Network status: online
                    </p>
                  </>
                )}
              </div>
              <div
                className={`${
                  criticalWaterLevels + criticalBins > 0
                    ? "bg-orange-100"
                    : "bg-green-100"
                } h-12 w-12 rounded-full flex items-center justify-center opacity-80`}
              >
                {criticalWaterLevels + criticalBins > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
            onClick={() => setLocation("/devices")}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Plus className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-medium">Add Device</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
            onClick={() => setLocation("/water-levels")}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Droplet className="h-8 w-8 text-blue-500 mb-2" />
              <p className="text-sm font-medium">Water Levels</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
            onClick={() => setLocation("/waste-bins")}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Trash2 className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">Waste Bins</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
            onClick={() => setLocation("/settings")}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Settings className="h-8 w-8 text-gray-500 mb-2" />
              <p className="text-sm font-medium">Settings</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {devices.length === 0 && !loading ? (
        <Card className="mb-6">
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Info className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-medium mb-2">No devices found</h3>
            <p className="text-center text-gray-500 mb-6 max-w-md">
              You haven't added any devices to your DrainSentry system yet. Add
              your first device to start monitoring your infrastructure.
            </p>

            <Link href="/devices">
              <Button>Add Your First Device</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-8">
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Devices</TabsTrigger>
                <TabsTrigger value="alerts">
                  Alerts ({criticalWaterLevels + criticalBins})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <h2 className="text-lg font-medium mb-4">Device Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {devices.map((device, index) => {
                    const waterLevel = waterData[device.firebaseKey];
                    const wasteBin = wasteData[device.firebaseKey];
                    const latestValues =
                      deviceLatestValues[device.firebaseKey] || {};

                    // Get the most recent values from history data
                    const latestWaterLevel = getLatestHistoryValueFromAll(
                      allWaterHistories,
                      device.firebaseKey,
                      "level"
                    );
                    const latestBinFullness = getLatestHistoryValueFromAll(
                      allWasteHistories,
                      device.firebaseKey,
                      "fullness"
                    );
                    const latestBinWeight = getLatestHistoryValueFromAll(
                      allWasteHistories,
                      device.firebaseKey,
                      "weight"
                    );

                    // Use latest values from history or fall back to real-time values
                    const currentWaterLevel =
                      typeof latestWaterLevel === "number"
                        ? latestWaterLevel
                        : latestValues.waterLevel ?? waterLevel?.level ?? 0;
                    const currentBinFullness =
                      typeof latestBinFullness === "number"
                        ? latestBinFullness
                        : latestValues.binFullness ?? wasteBin?.fullness ?? 0;
                    const currentBinWeight =
                      typeof latestBinWeight === "number"
                        ? latestBinWeight
                        : latestValues.binWeight ?? wasteBin?.weight ?? 0;

                    // Check if device is active based on latest updates
                    const lastUpdatedWater = latestValues.lastWaterUpdate
                      ? new Date(latestValues.lastWaterUpdate)
                      : waterLevel?.lastUpdated
                      ? new Date(waterLevel.lastUpdated)
                      : null;
                    const lastEmptiedBin = latestValues.lastBinUpdate
                      ? new Date(latestValues.lastBinUpdate)
                      : wasteBin?.lastEmptied
                      ? new Date(wasteBin.lastEmptied)
                      : null;

                    // Device is active if any sensor has been updated in the last 1 minute
                    const isActive =
                      (lastUpdatedWater && lastUpdatedWater >= oneMinuteAgo) ||
                      (lastEmptiedBin && lastEmptiedBin >= oneMinuteAgo);

                    return (
                      <motion.div
                        key={device.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 * index }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() =>
                          setLocation(`/water-levels/${device.id}`)
                        }
                        className="cursor-pointer"
                      >
                        <Card className="h-full border-2 hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent border-b">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Droplet className="h-2.5 w-2.5 text-white" />
                                  </div>
                                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <Trash2 className="h-2.5 w-2.5 text-white" />
                                  </div>
                                </div>
                                <CardTitle className="text-base font-medium text-gray-800">
                                  {device.name}
                                </CardTitle>
                              </div>
                              <Badge
                                variant={isActive ? "default" : "outline"}
                                className={
                                  isActive ? "" : "bg-gray-100 text-gray-500"
                                }
                              >
                                {isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center mt-1 text-sm text-gray-500">
                              <MapPin className="h-3.5 w-3.5 mr-1" />
                              {device.location}
                            </CardDescription>
                          </CardHeader>

                          <CardContent className="pt-3">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500">
                                    Bin Fullness
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={getBinTextColor(
                                      currentBinFullness
                                    )}
                                  >
                                    {getBinStatus(currentBinFullness)}
                                  </Badge>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1">
                                  <div
                                    className={`h-2.5 rounded-full ${getBinFullnessColor(
                                      currentBinFullness
                                    )}`}
                                    style={{
                                      width: `${currentBinFullness}%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                  <span>Current: {currentBinFullness}%</span>
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Last emptied:{" "}
                                    {wasteBin?.lastEmptied || "Never"}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500">
                                    Weight
                                  </span>
                                  <span className="text-sm font-medium">
                                    {currentBinWeight} kg
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Scale className="h-4 w-4 text-emerald-500" />
                                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                      className="h-2.5 rounded-full bg-emerald-500"
                                      style={{
                                        width: `${Math.min(
                                          (currentBinWeight / 100) * 100,
                                          100
                                        )}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Capacity: 100kg</span>
                                  <span>
                                    {Math.round((currentBinWeight / 100) * 100)}
                                    % full
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">
                                  Water Level
                                </span>
                                <span className="text-xs font-medium">
                                  {currentWaterLevel}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1">
                                <div
                                  className={`h-2.5 rounded-full ${getWaterLevelColor(
                                    currentWaterLevel
                                  )}`}
                                  style={{
                                    width: `${currentWaterLevel}%`,
                                  }}
                                ></div>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Badge
                                  variant="outline"
                                  className={getWaterLevelTextColor(
                                    currentWaterLevel
                                  )}
                                >
                                  {getWaterLevelStatus(currentWaterLevel)}
                                </Badge>
                                <span className="ml-auto flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {waterLevel?.lastUpdated || "Never"}
                                </span>
                              </div>
                            </div>
                          </CardContent>

                          <CardFooter className="flex justify-between border-t pt-2 pb-2 bg-gray-50">
                            <div className="flex items-center text-xs text-gray-500">
                              <CalendarClock className="h-3.5 w-3.5 mr-1" />
                              Last seen: {device.lastSeen}
                            </div>

                            <div className="flex gap-3">
                              <Link
                                to={`/water-levels/${device.id}`}
                                className="flex items-center text-primary text-sm"
                              >
                                Details
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Link>
                              <Link
                                to={`/device-history/${device.id}`}
                                className="flex items-center text-emerald-600 text-sm"
                              >
                                History
                                <BarChart2 className="h-4 w-4 ml-1" />
                              </Link>
                            </div>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="mt-0">
                <h2 className="text-lg font-medium mb-4">Critical Devices</h2>
                {criticalWaterLevels + criticalBins === 0 ? (
                  <Card>
                    <CardContent className="py-6 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <InfoIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">
                        All Systems Normal
                      </h3>
                      <p className="text-center text-gray-500">
                        There are no critical alerts at this time.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((device, index) => {
                      const waterLevel = waterData[device.firebaseKey];
                      const wasteBin = wasteData[device.firebaseKey];

                      // Only show critical devices
                      if (
                        waterLevel &&
                        waterLevel.level <= 85 &&
                        wasteBin &&
                        wasteBin.fullness <= 85
                      ) {
                        return null;
                      }

                      // Check if device is active
                      const lastUpdatedWater = waterLevel?.lastUpdated
                        ? new Date(waterLevel.lastUpdated)
                        : null;
                      const lastEmptiedBin = wasteBin?.lastEmptied
                        ? new Date(wasteBin.lastEmptied)
                        : null;

                      // Define fiveMinutesAgo for critical device activity check
                      const fiveMinutesAgo = new Date();
                      fiveMinutesAgo.setTime(
                        fiveMinutesAgo.getTime() - 5 * 60 * 1000
                      );

                      const isActive =
                        (lastUpdatedWater &&
                          lastUpdatedWater >= fiveMinutesAgo) ||
                        (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo);

                      return (
                        <motion.div
                          key={device.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          className="col-span-1"
                          onClick={() =>
                            setLocation(`/water-level-details?id=${device.id}`)
                          }
                        >
                          <Card className="h-full border-2 border-red-200 hover:border-red-500 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                            <CardHeader className="pb-3 bg-red-50">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-medium">
                                  {device.name}
                                </CardTitle>
                                <Badge
                                  variant={isActive ? "destructive" : "outline"}
                                  className={
                                    isActive ? "" : "bg-gray-100 text-gray-500"
                                  }
                                >
                                  {isActive ? "Critical" : "Inactive"}
                                </Badge>
                              </div>
                              <CardDescription className="flex items-center mt-1">
                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                {device.location}
                              </CardDescription>
                            </CardHeader>

                            <CardContent className="pb-3">
                              <div className="space-y-3">
                                {waterLevel && waterLevel.level > 85 && (
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-gray-500 flex items-center">
                                        <Droplet className="h-3.5 w-3.5 mr-1 text-red-500" />
                                        Water Level
                                      </span>
                                      <Badge variant="destructive">
                                        {waterLevel.level}%
                                      </Badge>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className="h-2 rounded-full bg-red-500"
                                        style={{
                                          width: `${waterLevel.level}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <div className="mt-1 text-xs text-red-500">
                                      Critical level detected - requires
                                      immediate attention
                                    </div>
                                  </div>
                                )}

                                {wasteBin && wasteBin.fullness > 85 && (
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-gray-500 flex items-center">
                                        <Trash2 className="h-3.5 w-3.5 mr-1 text-red-500" />
                                        Bin Fullness
                                      </span>
                                      <Badge variant="destructive">
                                        {wasteBin.fullness}%
                                      </Badge>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className="h-2 rounded-full bg-red-500"
                                        style={{
                                          width: `${wasteBin.fullness}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <div className="mt-1 text-xs text-red-500">
                                      Bin needs emptying soon
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>

                            <CardFooter className="pt-0 border-t flex justify-between items-center py-2">
                              <div className="text-xs text-gray-500 flex items-center">
                                <BadgeAlert className="h-3.5 w-3.5 mr-1 text-red-500" />
                                Critical Alert
                              </div>
                              <span className="text-sm text-red-500 flex items-center">
                                View Details
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </span>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Trend Analysis
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Droplet className="h-5 w-5 text-blue-500" />
                        Water Level Trends
                      </CardTitle>
                      <CardDescription>
                        {timeFilter === "hour"
                          ? "Hourly"
                          : timeFilter === "day"
                          ? "Daily"
                          : timeFilter === "week"
                          ? "Weekly"
                          : "Monthly"}{" "}
                        water level readings
                      </CardDescription>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-md">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {waterChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-72">
                      <p className="text-gray-500">No data found</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={waterChartData}
                            margin={{
                              top: 10,
                              right: 10,
                              left: 10,
                              bottom: 10,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="colorWater"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#3b82f6"
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#3b82f6"
                                  stopOpacity={0.1}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#eee"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              axisLine={{ stroke: "#e5e7eb" }}
                              tickLine={{ stroke: "#e5e7eb" }}
                            />
                            <YAxis
                              tickFormatter={(value) => `${value}%`}
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              axisLine={{ stroke: "#e5e7eb" }}
                              tickLine={{ stroke: "#e5e7eb" }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${value}%`,
                                "Water Level",
                              ]}
                              contentStyle={{
                                backgroundColor: "white",
                                borderRadius: "6px",
                                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorWater)"
                              activeDot={{
                                r: 6,
                                stroke: "white",
                                strokeWidth: 2,
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex justify-between items-center mt-4 px-2">
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                          <span className="text-sm text-gray-500">
                            Water Level
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Last update: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent border-b pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-emerald-500" />
                        Waste Bin Status
                      </CardTitle>
                      <CardDescription>
                        {timeFilter === "hour"
                          ? "Hourly"
                          : timeFilter === "day"
                          ? "Daily"
                          : timeFilter === "week"
                          ? "Weekly"
                          : "Monthly"}{" "}
                        bin fullness readings
                      </CardDescription>
                    </div>
                    <div className="bg-emerald-100 p-2 rounded-md">
                      <Activity className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {wasteChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-72">
                      <p className="text-gray-500">No data found</p>
                    </div>
                  ) : (
                    <>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={wasteChartData}
                            margin={{
                              top: 10,
                              right: 10,
                              left: 10,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#eee"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 12 }}
                              axisLine={{ stroke: "#e5e7eb" }}
                              tickLine={{ stroke: "#e5e7eb" }}
                            />
                            <YAxis
                              tickFormatter={(value) => `${value}%`}
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              axisLine={{ stroke: "#e5e7eb" }}
                              tickLine={{ stroke: "#e5e7eb" }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${value}%`,
                                "Bin Fullness",
                              ]}
                              contentStyle={{
                                backgroundColor: "white",
                                borderRadius: "6px",
                                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                            <Bar
                              dataKey="value"
                              radius={[4, 4, 0, 0]}
                              fillOpacity={0.9}
                              barSize={30}
                              fill="#10b981"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex justify-between items-center mt-4 px-2">
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full bg-emerald-500 mr-2"></div>
                          <span className="text-sm text-gray-500">
                            Bin Fullness
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Last update: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
