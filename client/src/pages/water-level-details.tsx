import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from "recharts";
import { AlertTriangleIcon, InfoIcon, TrendingUpIcon, TrendingDownIcon, CloudRainIcon } from "lucide-react";
import { useLocation } from "wouter";
import { WaterLevel, WasteBin, Device } from "@/types";
import { useWaterLevelHistory, useWasteBinHistory } from "@/hooks/useHistoryData";

// Define the interface for water level history
interface WaterLevelHistory {
  timestamp: string;
  level: number;
}

// Define the interface for waste bin history
interface WasteBinHistory {
  timestamp: string;
  fullness: number;
  weight: number;
}

// Define prediction interface for predictive analytics
interface Prediction {
  timestamp: string;
  predictedLevel: number;
  confidence: number;
}

// Define trend data interface for trend analysis
interface TrendData {
  period: string;
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePct: number;
}

interface RainData {
  date: string;
  precipitation: number;
}

export default function WaterLevelDetails() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [device, setDevice] = useState<Device | null>(null);
  const [waterLevel, setWaterLevel] = useState<WaterLevel | null>(null);
  const [wasteBin, setWasteBin] = useState<WasteBin | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [waterTrends, setWaterTrends] = useState<TrendData[]>([]);
  const [wasteTrends, setWasteTrends] = useState<TrendData[]>([]);
  const [rainData, setRainData] = useState<RainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Get device ID from URL - either query parameter or path parameter
  let deviceId: string | null = null;
  
  // Check for query parameter format (?id=XXX)
  const urlParams = new URLSearchParams(window.location.search);
  const queryId = urlParams.get('id');
  
  // Check for path parameter format (/water-levels/XXX)
  const [, pathId] = location.split("/water-levels/");
  
  // Use query parameter if available, otherwise use path parameter
  deviceId = queryId || pathId;
  
  // Get history data using the hooks
  const { history: waterHistory, loading: waterHistoryLoading } = useWaterLevelHistory(deviceId || "");
  const { history: binHistory, loading: binHistoryLoading } = useWasteBinHistory(deviceId || "");

  useEffect(() => {
    if (!user || !deviceId) return;
    
    const deviceRef = ref(database, `users/${user.uid}/devices`);
    const deviceUnsubscribe = onValue(deviceRef, (snapshot) => {
      if (!snapshot.exists()) {
        setDevice(null);
        setLoading(false);
        return;
      }
      
      // Find device by ID
      const devices = snapshot.val();
      let foundDevice = null;
      let deviceKey = null;
      
      Object.entries(devices).forEach(([key, value]: [string, any]) => {
        if (value.id === deviceId) {
          foundDevice = { ...value, id: deviceId };
          deviceKey = key;
        }
      });
      
      if (!foundDevice) {
        setDevice(null);
        setLoading(false);
        return;
      }
      
      setDevice(foundDevice);
      
      // Get water level data
      const waterLevelRef = ref(database, `users/${user.uid}/waterLevels/${deviceKey}`);
      const waterLevelUnsubscribe = onValue(waterLevelRef, (waterLevelSnapshot) => {
        if (waterLevelSnapshot.exists()) {
          setWaterLevel(waterLevelSnapshot.val());
        } else {
          setWaterLevel(null);
        }
      });
      
      // Get waste bin data
      const wasteBinRef = ref(database, `users/${user.uid}/wasteBins/${deviceKey}`);
      const wasteBinUnsubscribe = onValue(wasteBinRef, (wasteBinSnapshot) => {
        if (wasteBinSnapshot.exists()) {
          setWasteBin(wasteBinSnapshot.val());
        } else {
          setWasteBin(null);
        }
      });
      
    });
    
    setLoading(false);

    return () => {
      deviceUnsubscribe();
    };
  }, [user, deviceId]);
  
  // Generate predictions and trends when history data changes
  useEffect(() => {
    if (waterHistory.length > 0) {
      // Convert HistoryEntry[] to WaterLevelHistory[] format
      const waterLevelHistory: WaterLevelHistory[] = waterHistory.map(entry => ({
        timestamp: entry.timestamp,
        level: entry.level || 0
      }));
      
      setPredictions(generateSamplePredictions(waterLevelHistory));
      setWaterTrends(generateSampleWaterTrends(waterLevelHistory));
      setRainData(generateSampleRainData());
    }
  }, [waterHistory]);
  
  useEffect(() => {
    if (binHistory.length > 0) {
      // Convert HistoryEntry[] to WasteBinHistory[] format
      const wasteBinHistory: WasteBinHistory[] = binHistory.map(entry => ({
        timestamp: entry.timestamp,
        fullness: entry.fullness || 0,
        weight: entry.weight || 0
      }));
      
      setWasteTrends(generateSampleWasteTrends(wasteBinHistory));
    }
  }, [binHistory]);
  

  function generateSamplePredictions(history: WaterLevelHistory[]): Prediction[] {
    if (!history.length) return [];
    
    const predictions: Prediction[] = [];
    const lastPoint = history[history.length - 1];
    const now = new Date(lastPoint.timestamp);
    
    // Simple linear trend-based prediction (simplified)
    // In a real app, this would use more sophisticated algorithms
    let trend = 0;
    if (history.length > 1) {
      const recentHistory = history.slice(-5);
      const avgChange = recentHistory.reduce((sum, curr, i, arr) => {
        if (i === 0) return sum;
        return sum + (curr.level - arr[i-1].level);
      }, 0) / (recentHistory.length - 1);
      
      trend = avgChange;
    }
    
    // Generate predictions for the next 5 days
    for (let i = 1; i <= 5; i++) {
      const predictionDate = new Date(now);
      predictionDate.setDate(now.getDate() + i);
      
      // Use trend to predict future values, with confidence decreasing over time
      const predictedLevel = Math.max(0, Math.min(100, lastPoint.level + (trend * i)));
      const confidence = Math.max(10, 90 - (i * 15)); // Confidence decreases over time
      
      predictions.push({
        timestamp: predictionDate.toISOString(),
        predictedLevel,
        confidence
      });
    }
    
    return predictions;
  }
  
  function generateSampleWaterTrends(history: WaterLevelHistory[]): TrendData[] {
    if (!history.length) return [];
    
    // Calculate trends for different time periods
    const now = new Date();
    const trends: TrendData[] = [];
    
    // Daily trend (last 24 hours)
    const dayStart = new Date(now);
    dayStart.setHours(now.getHours() - 24);
    const dayData = history.filter(item => new Date(item.timestamp) >= dayStart);
    
    if (dayData.length >= 2) {
      const startValue = dayData[0].level;
      const endValue = dayData[dayData.length - 1].level;
      const changePct = ((endValue - startValue) / startValue) * 100;
      const trend = changePct > 1 ? 'increasing' : (changePct < -1 ? 'decreasing' : 'stable');
      
      trends.push({
        period: "24 hours",
        value: endValue,
        trend,
        changePct
      });
    }
    
    // Weekly trend
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekData = history.filter(item => new Date(item.timestamp) >= weekStart);
    
    if (weekData.length >= 2) {
      const startValue = weekData[0].level;
      const endValue = weekData[weekData.length - 1].level;
      const changePct = ((endValue - startValue) / startValue) * 100;
      const trend = changePct > 1 ? 'increasing' : (changePct < -1 ? 'decreasing' : 'stable');
      
      trends.push({
        period: "7 days",
        value: endValue,
        trend,
        changePct
      });
    }
    
    // Monthly trend
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    const monthData = history.filter(item => new Date(item.timestamp) >= monthStart);
    
    if (monthData.length >= 2) {
      const startValue = monthData[0].level;
      const endValue = monthData[monthData.length - 1].level;
      const changePct = ((endValue - startValue) / startValue) * 100;
      const trend = changePct > 1 ? 'increasing' : (changePct < -1 ? 'decreasing' : 'stable');
      
      trends.push({
        period: "30 days",
        value: endValue,
        trend,
        changePct
      });
    }
    
    return trends;
  }
  
  function generateSampleWasteTrends(history: WasteBinHistory[]): TrendData[] {
    if (!history.length) return [];
    
    // Calculate trends for different time periods
    const now = new Date();
    const trends: TrendData[] = [];
    
    // Daily trend (last 24 hours)
    const dayStart = new Date(now);
    dayStart.setHours(now.getHours() - 24);
    const dayData = history.filter(item => new Date(item.timestamp) >= dayStart);
    
    if (dayData.length >= 2) {
      const startValue = dayData[0].fullness;
      const endValue = dayData[dayData.length - 1].fullness;
      const changePct = ((endValue - startValue) / (startValue || 1)) * 100;
      const trend = changePct > 1 ? 'increasing' : (changePct < -1 ? 'decreasing' : 'stable');
      
      trends.push({
        period: "24 hours",
        value: endValue,
        trend,
        changePct
      });
    }
    
    // Weekly trend
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekData = history.filter(item => new Date(item.timestamp) >= weekStart);
    
    if (weekData.length >= 2) {
      const startValue = weekData[0].fullness;
      const endValue = weekData[weekData.length - 1].fullness;
      const changePct = ((endValue - startValue) / (startValue || 1)) * 100;
      const trend = changePct > 1 ? 'increasing' : (changePct < -1 ? 'decreasing' : 'stable');
      
      trends.push({
        period: "7 days",
        value: endValue,
        trend,
        changePct
      });
    }
    
    // Monthly trend
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);
    const monthData = history.filter(item => new Date(item.timestamp) >= monthStart);
    
    if (monthData.length >= 2) {
      const startValue = monthData[0].fullness;
      const endValue = monthData[monthData.length - 1].fullness;
      const changePct = ((endValue - startValue) / (startValue || 1)) * 100;
      const trend = changePct > 1 ? 'increasing' : (changePct < -1 ? 'decreasing' : 'stable');
      
      trends.push({
        period: "30 days",
        value: endValue,
        trend,
        changePct
      });
    }
    
    return trends;
  }
  
  function generateSampleRainData(): RainData[] {
    const rainData: RainData[] = [];
    const now = new Date();
    
    // Past 5 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      // Random precipitation data (mm)
      const precipitation = Math.random() * 15;
      
      rainData.push({
        date: date.toISOString().split('T')[0],
        precipitation: Number(precipitation.toFixed(1))
      });
    }
    
    // Future 5 days (forecast)
    for (let i = 1; i <= 5; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      
      // Random precipitation forecast (mm)
      const precipitation = Math.random() * 10;
      
      rainData.push({
        date: date.toISOString().split('T')[0],
        precipitation: Number(precipitation.toFixed(1))
      });
    }
    
    return rainData;
  }
  
  function getWaterLevelColor(level: number): string {
    if (level > 85) return "bg-red-500";
    if (level > 65) return "bg-amber-500";
    if (level > 35) return "bg-green-500";
    return "bg-blue-500";
  }
  
  function getWaterLevelTextColor(level: number): string {
    if (level > 85) return "text-red-500";
    if (level > 65) return "text-amber-500";
    if (level > 35) return "text-green-500";
    return "text-blue-500";
  }
  
  function getWaterLevelStatus(level: number): string {
    if (level > 85) return "Critical";
    if (level > 65) return "Warning";
    if (level > 35) return "Normal";
    return "Low";
  }
  
  function getStatusBackground(level: number): string {
    if (level > 85) return "bg-red-100";
    if (level > 65) return "bg-amber-100";
    if (level > 35) return "bg-green-100";
    return "bg-blue-100";
  }
  
  function getBinFullnessColor(fullness: number): string {
    if (fullness > 85) return "bg-red-500";
    if (fullness > 65) return "bg-amber-500";
    return "bg-green-500";
  }
  
  function getBinTextColor(fullness: number): string {
    if (fullness > 85) return "text-red-500";
    if (fullness > 65) return "text-amber-500";
    return "text-green-500";
  }
  
  function getBinStatus(fullness: number): string {
    if (fullness > 85) return "Full";
    if (fullness > 65) return "Warning";
    return "OK";
  }
  
  function getTrendAnalysis(): string {
    if (!waterHistory.length) return "Insufficient data";
    
    const current = waterHistory[waterHistory.length - 1].level;
    const previous = waterHistory[0].level;
    const change = current - previous;
    
    if (Math.abs(change) < 5) {
      return "Water levels have remained relatively stable over the monitored period.";
    } else if (change > 0) {
      return `Water levels have increased by approximately ${change.toFixed(1)}% over the monitored period. This could indicate increased rainfall or reduced drainage capacity.`;
    } else {
      return `Water levels have decreased by approximately ${Math.abs(change).toFixed(1)}% over the monitored period. This indicates effective drainage or reduced water input.`;
    }
  }
  
  function getRecommendations(): string[] {
    const recommendations = [];
    
    // Water level based recommendations
    if (waterLevel) {
      if (waterLevel.level > 85) {
        recommendations.push("URGENT: Water levels are critically high. Immediate inspection recommended.");
        recommendations.push("Consider emergency drainage protocols.");
      } else if (waterLevel.level > 65) {
        recommendations.push("Water levels are elevated. Schedule an inspection within 24-48 hours.");
        recommendations.push("Monitor drainage outflow for potential blockages.");
      }
    }
    
    // Waste bin based recommendations
    if (wasteBin) {
      if (wasteBin.fullness > 85) {
        recommendations.push("Waste bin is nearly full. Schedule collection immediately.");
      } else if (wasteBin.fullness > 65) {
        recommendations.push("Waste bin is filling up. Plan collection within the next 3 days.");
      }
      
      if (wasteBin.weight > 50) {
        recommendations.push("Waste weight is high. Ensure appropriate handling equipment is used during collection.");
      }
    }
    
    // Trend based recommendations
    if (waterTrends.length > 0) {
      const latestTrend = waterTrends[0];
      if (latestTrend.trend === 'increasing' && latestTrend.changePct > 10) {
        recommendations.push(`Water level is rising rapidly (${latestTrend.changePct.toFixed(1)}% in ${latestTrend.period}). Investigate potential inflow issues.`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push("All systems operating within normal parameters. No immediate action required.");
      recommendations.push("Continue regular maintenance schedule.");
    }
    
    return recommendations;
  }
  
  if (loading) {
    return (
      <DashboardLayout title="Loading..." subtitle="Please wait">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!device) {
    return (
      <DashboardLayout title="Device Not Found" subtitle="The requested device could not be found">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertTriangleIcon className="w-16 h-16 text-amber-500" />
          <h2 className="text-xl font-semibold">Device Not Found</h2>
          <p className="text-gray-500">The water level device you're looking for could not be found.</p>
          <Button onClick={() => setLocation("/water-levels")}>Return to Water Levels</Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout 
      title={device.name || "Water Level Details"} 
      subtitle={device.location || "Location not specified"}
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Water Level Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Current Water Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {waterLevel ? `${waterLevel.level}%` : "N/A"}
                </div>
                <div className="text-sm text-gray-500">
                  Last updated: {waterLevel ? waterLevel.lastUpdated : "Never"}
                </div>
              </div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center">
                <div 
                  className={`w-full h-full rounded-full flex items-center justify-center ${waterLevel ? getStatusBackground(waterLevel.level) : "bg-gray-100"}`}
                >
                  <div 
                    className={`text-sm font-medium ${waterLevel ? getWaterLevelTextColor(waterLevel.level) : "text-gray-400"}`}
                  >
                    {waterLevel ? getWaterLevelStatus(waterLevel.level) : "No data"}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Water level visualization */}
            <div className="mt-4 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${waterLevel ? getWaterLevelColor(waterLevel.level) : "bg-gray-400"}`}
                style={{ width: `${waterLevel ? waterLevel.level : 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
        
        {/* Waste Bin Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Waste Bin Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {wasteBin ? `${wasteBin.fullness}%` : "N/A"}
                </div>
                <div className="text-sm text-gray-500">
                  Last emptied: {wasteBin ? wasteBin.lastEmptied : "Never"}
                </div>
              </div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center">
                <div 
                  className={`w-full h-full rounded-full flex items-center justify-center ${wasteBin ? (wasteBin.fullness > 85 ? "bg-red-100" : wasteBin.fullness > 65 ? "bg-amber-100" : "bg-green-100") : "bg-gray-100"}`}
                >
                  <div 
                    className={`text-sm font-medium ${wasteBin ? getBinTextColor(wasteBin.fullness) : "text-gray-400"}`}
                  >
                    {wasteBin ? getBinStatus(wasteBin.fullness) : "No data"}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Fullness visualization */}
            <div className="mt-4 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${wasteBin ? getBinFullnessColor(wasteBin.fullness) : "bg-gray-400"}`}
                style={{ width: `${wasteBin ? wasteBin.fullness : 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
        
        {/* Waste Weight Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Waste Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {wasteBin ? `${wasteBin.weight.toFixed(1)} kg` : "N/A"}
                </div>
                <div className="text-sm text-gray-500">
                  Measured capacity: 100 kg
                </div>
              </div>
              <div className="w-16 h-16">
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 10H20L12 3Z" fill="#94A3B8" />
                  <rect x="5" y="10" width="14" height="2" fill="#94A3B8" />
                  <rect x="6" y="12" width="12" height="8" fill="#94A3B8" />
                  <rect x="8" y="20" width="8" height="1" fill="#94A3B8" />
                </svg>
              </div>
            </div>
            
            {/* Weight visualization */}
            <div className="mt-4 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500"
                style={{ width: `${wasteBin ? Math.min(100, (wasteBin.weight / 100) * 100) : 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Overview Section */}
      <div className="w-full mb-6">
        
        {/* Overview Content */}
        <div className="space-y-6">
          {/* Chart Card */}
          <Card>
            <CardHeader>
              <CardTitle>Combined Sensor Readings</CardTitle>
              <CardDescription>Last 7 days of data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {waterHistory.length > 0 || binHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={waterHistory.map((item, index) => ({
                        date: new Date(item.timestamp).toLocaleDateString(),
                        waterLevel: item.level,
                        binFullness: binHistory[index]?.fullness || 0,
                        binWeight: binHistory[index]?.weight || 0,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="waterLevel" 
                        name="Water Level (%)"
                        stroke="#2563eb" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="binFullness" 
                        name="Bin Fullness (%)"
                        stroke="#16a34a" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="binWeight" 
                        name="Bin Weight (kg)"
                        stroke="#7c3aed" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <p className="mb-2">No historical data available</p>
                      <p className="text-sm">Data will appear here once readings are received</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Trends and Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Average Water Level */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Water Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-28">
                  <div className="text-lg font-bold">{waterHistory.length > 0 ? Math.round(waterHistory.reduce((acc, item) => acc + item.level, 0) / waterHistory.length) : 0}%</div>
                  {waterHistory.length === 0 && (
                    <div className="text-xs text-gray-500 mt-2">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Average Bin Fullness */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Bin Fullness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-28">
                  <div className="text-lg font-bold">{binHistory.length > 0 ? Math.round(binHistory.reduce((acc, item) => acc + item.fullness, 0) / binHistory.length) : 0}%</div>
                  {binHistory.length === 0 && (
                    <div className="text-xs text-gray-500 mt-2">No data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Device Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Device Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-28">
                  <Badge variant={device.status === "active" ? "default" : "outline"}>
                    {device.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-2">
                    Last seen: {device.lastSeen}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Action Button Group */}
        <div className="flex flex-wrap gap-2 mt-6">
          <Button 
            variant="outline"
            className="flex items-center"
            onClick={() => setLocation("/devices")}
          >
            Manage Device
          </Button>
          <Button 
            variant="outline"
            className="flex items-center"
            onClick={() => setLocation("/device-history/" + deviceId)}
          >
            View Device History
          </Button>
          <Button
            className="flex items-center ml-auto"
            onClick={() => setLocation("/water-levels")}
          >
            Back to Water Levels
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}