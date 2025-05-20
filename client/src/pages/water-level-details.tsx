import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast, orderByKey } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Droplet, 
  Trash, 
  Scale,
  ArrowLeft, 
  CalendarClock, 
  MapPin,
  Clock,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Gauge
} from "lucide-react";
import { Device, WaterLevel, WasteBin } from "@/types";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

interface WaterLevelHistory {
  timestamp: string;
  level: number;
}

interface WasteBinHistory {
  timestamp: string;
  fullness: number;
  weight: number;
}

export default function WaterLevelDetails() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [device, setDevice] = useState<Device | null>(null);
  const [waterLevel, setWaterLevel] = useState<WaterLevel | null>(null);
  const [wasteBin, setWasteBin] = useState<WasteBin | null>(null);
  const [waterHistory, setWaterHistory] = useState<WaterLevelHistory[]>([]);
  const [binHistory, setBinHistory] = useState<WasteBinHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Get device ID from URL query parameter
  const params = new URLSearchParams(location.split("?")[1]);
  const deviceId = params.get("id");
  
  useEffect(() => {
    if (!user || !deviceId) return;

    // Get device data
    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    const deviceUnsubscribe = onValue(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        setDevice({
          id: deviceId,
          ...snapshot.val()
        });
      } else {
        setDevice(null);
      }
    });

    // Get water level data
    const waterLevelRef = ref(database, `users/${user.uid}/waterLevels/${deviceId}`);
    const waterLevelUnsubscribe = onValue(waterLevelRef, (snapshot) => {
      if (snapshot.exists()) {
        setWaterLevel(snapshot.val());
      } else {
        setWaterLevel(null);
      }
    });

    // Get waste bin data
    const wasteBinRef = ref(database, `users/${user.uid}/wasteBins/${deviceId}`);
    const wasteBinUnsubscribe = onValue(wasteBinRef, (snapshot) => {
      if (snapshot.exists()) {
        setWasteBin(snapshot.val());
      } else {
        setWasteBin(null);
      }
    });

    // Get historical data
    // This would usually come from another Firebase collection of historical data
    // For now, let's generate sample data for the demo
    const waterHistoryData = generateSampleWaterHistory();
    const binHistoryData = generateSampleBinHistory();
    setWaterHistory(waterHistoryData);
    setBinHistory(binHistoryData);
    
    setLoading(false);

    return () => {
      deviceUnsubscribe();
      waterLevelUnsubscribe();
      wasteBinUnsubscribe();
    };
  }, [user, deviceId]);

  // Generate sample water level history data
  function generateSampleWaterHistory(): WaterLevelHistory[] {
    const data: WaterLevelHistory[] = [];
    const now = new Date();
    
    // Generate data for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() - i);
      
      data.push({
        timestamp: timestamp.toISOString(),
        level: Math.floor(Math.random() * 100)
      });
    }
    
    return data.reverse();
  }

  // Generate sample waste bin history data
  function generateSampleBinHistory(): WasteBinHistory[] {
    const data: WasteBinHistory[] = [];
    const now = new Date();
    
    // Generate data for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() - i);
      
      data.push({
        timestamp: timestamp.toISOString(),
        fullness: Math.floor(Math.random() * 100),
        weight: Math.floor(Math.random() * 100)
      });
    }
    
    return data.reverse();
  }

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

  function getStatusBackground(level: number): string {
    if (level > 85) return "bg-red-50";
    if (level > 65) return "bg-orange-50";
    return "bg-green-50";
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

  // Format date for charts
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Get trend analysis based on historical data
  function getTrendAnalysis(): string {
    if (!waterHistory.length) return "Insufficient data";
    
    const current = waterHistory[waterHistory.length - 1].level;
    const previous = waterHistory[0].level;
    
    const difference = current - previous;
    
    if (Math.abs(difference) < 5) {
      return "Stable - Water level has been relatively stable over the past 24 hours.";
    } else if (difference > 0) {
      return "Rising - Water level has increased by approximately " + difference + "% over the past 24 hours.";
    } else {
      return "Falling - Water level has decreased by approximately " + Math.abs(difference) + "% over the past 24 hours.";
    }
  }

  // Get recommendations based on current levels
  function getRecommendations(): string[] {
    const recommendations = [];
    
    if (!waterLevel || !wasteBin) return ["No data available for recommendations"];
    
    if (waterLevel.level > 85) {
      recommendations.push("Critical water level detected. Immediate attention required.");
      recommendations.push("Activate emergency drainage protocols.");
    } else if (waterLevel.level > 65) {
      recommendations.push("Water level trending high. Consider initiating drainage.");
      recommendations.push("Increase monitoring frequency.");
    }
    
    if (wasteBin.fullness > 85) {
      recommendations.push("Bin nearing capacity. Schedule emptying within 24 hours.");
    }
    
    if (wasteBin.weight > 80) {
      recommendations.push("Bin weight approaching maximum capacity. Prioritize emptying.");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("All systems operating within normal parameters.");
      recommendations.push("Continue routine maintenance and monitoring.");
    }
    
    return recommendations;
  }

  // Calculate active status based on recent data updates (last 5 minutes)
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
  const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
  
  const isActive = (
    (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo) ||
    (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo)
  );

  // Color array for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  if (loading) {
    return (
      <DashboardLayout title="Loading..." subtitle="Please wait">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!device || !deviceId) {
    return (
      <DashboardLayout title="Device Not Found" subtitle="The requested device could not be found">
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Device Not Found</h3>
          <p className="text-gray-500 text-center mb-6">
            The device you are looking for does not exist or you don't have access to it.
          </p>
          
          <Link href="/water-levels">
            <Button>
              Go Back to Monitoring
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={device.name} 
      subtitle={`Device monitoring and history`}
    >
      <div className="mb-4">
        <Button 
          variant="outline" 
          className="mb-4"
          onClick={() => setLocation('/water-levels')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Monitoring
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview" onClick={() => setActiveTab("overview")}>Overview</TabsTrigger>
          <TabsTrigger value="water-history" onClick={() => setActiveTab("water-history")}>Water Level History</TabsTrigger>
          <TabsTrigger value="waste-history" onClick={() => setActiveTab("waste-history")}>Waste Bin History</TabsTrigger>
          <TabsTrigger value="analysis" onClick={() => setActiveTab("analysis")}>Analysis</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium">Device Information</CardTitle>
                  <Badge 
                    variant={isActive ? "default" : "outline"}
                    className={isActive ? "" : "bg-gray-100 text-gray-500"}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {device.location}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Water Level</h3>
                      <div className={`rounded-lg p-3 ${getStatusBackground(waterLevel?.level || 0)}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Current Level</span>
                          <Badge className={getWaterLevelTextColor(waterLevel?.level || 0)}>
                            {getWaterLevelStatus(waterLevel?.level || 0)}
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
                          <div 
                            className={`h-3 rounded-full ${getWaterLevelColor(waterLevel?.level || 0)}`} 
                            style={{ width: `${waterLevel?.level || 0}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold">{waterLevel?.level || 0}%</span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Last updated: {waterLevel?.lastUpdated || 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Trend Analysis</h3>
                      <div className="rounded-lg p-3 bg-blue-50">
                        <p className="text-sm text-gray-700">
                          {getTrendAnalysis()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Waste Bin Status</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-lg p-3 ${wasteBin?.fullness && wasteBin.fullness > 60 ? "bg-orange-50" : "bg-green-50"}`}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <Trash className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="text-sm text-gray-500">Fullness</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1">
                            <div 
                              className={`h-2.5 rounded-full ${getBinFullnessColor(wasteBin?.fullness || 0)}`} 
                              style={{ width: `${wasteBin?.fullness || 0}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">{wasteBin?.fullness || 0}%</span>
                            <Badge variant="outline" className={getBinTextColor(wasteBin?.fullness || 0)}>
                              {getBinStatus(wasteBin?.fullness || 0)}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="rounded-lg p-3 bg-blue-50">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <Scale className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="text-sm text-gray-500">Weight</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1">
                            <div 
                              className="h-2.5 rounded-full bg-blue-500" 
                              style={{ width: `${Math.min((wasteBin?.weight || 0) / 100 * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">{wasteBin?.weight || 0} kg</span>
                            <span className="text-xs text-gray-500">/ 100 kg</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Last emptied: {wasteBin?.lastEmptied || 'Never'}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">System Recommendations</h3>
                      <div className="rounded-lg p-3 bg-gray-50">
                        <ul className="text-sm text-gray-700 space-y-2">
                          {getRecommendations().map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <PieChart width={200} height={200} className="mx-auto">
                      <Pie
                        data={[
                          { name: 'Water Level', value: waterLevel?.level || 0 },
                          { name: 'Remaining', value: 100 - (waterLevel?.level || 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold">
                        {waterLevel?.level || 0}%
                      </text>
                    </PieChart>
                    <div className="text-center mt-2">
                      <h3 className="text-sm font-medium">Water Level</h3>
                      <p className="text-xs text-gray-500">Current capacity</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-2">
                        <Droplet className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-lg font-bold">{waterHistory.length > 0 ? Math.round(waterHistory.reduce((acc, item) => acc + item.level, 0) / waterHistory.length) : 0}%</div>
                      <div className="text-xs text-gray-500">Avg. water level</div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-2">
                        <Trash className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-lg font-bold">{binHistory.length > 0 ? Math.round(binHistory.reduce((acc, item) => acc + item.fullness, 0) / binHistory.length) : 0}%</div>
                      <div className="text-xs text-gray-500">Avg. bin fullness</div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-3">
                <div className="w-full text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="bg-blue-500 h-2 w-2 rounded-full"></div>
                    <span className="text-xs text-gray-500">Water Level</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="bg-green-500 h-2 w-2 rounded-full"></div>
                    <span className="text-xs text-gray-500">Bin Status</span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base font-medium">Real-Time Monitoring</CardTitle>
              <CardDescription>24-hour overview of device sensors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={waterHistory.map((item, index) => ({
                      name: formatDate(item.timestamp),
                      waterLevel: item.level,
                      binFullness: binHistory[index]?.fullness || 0,
                      binWeight: binHistory[index]?.weight || 0,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="waterLevel" 
                      stroke="#3b82f6" 
                      activeDot={{ r: 8 }} 
                      strokeWidth={2}
                      name="Water Level (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="binFullness" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Bin Fullness (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="binWeight" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Weight (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Water Level History Tab */}
        <TabsContent value="water-history">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base font-medium">Water Level History</CardTitle>
              <CardDescription>24-hour water level measurements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={waterHistory.map(item => ({
                      name: formatDate(item.timestamp),
                      level: item.level,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#3b82f6" 
                      fill="url(#colorLevel)" 
                      name="Water Level (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Critical Points</CardTitle>
                <CardDescription>Times when water level exceeded critical threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {waterHistory.filter(item => item.level > 85).length > 0 ? (
                    waterHistory
                      .filter(item => item.level > 85)
                      .map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                            <span className="text-sm">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span className="font-medium text-destructive">{item.level}%</span>
                        </div>
                      ))
                  ) : (
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
                      <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                      <span className="text-sm text-gray-500">No critical events recorded</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Statistics</CardTitle>
                <CardDescription>Summary of water level data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Average Level</div>
                    <div className="text-2xl font-bold">
                      {waterHistory.length > 0 ? Math.round(waterHistory.reduce((acc, item) => acc + item.level, 0) / waterHistory.length) : 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Max Level</div>
                    <div className="text-2xl font-bold">
                      {waterHistory.length > 0 ? Math.max(...waterHistory.map(item => item.level)) : 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Min Level</div>
                    <div className="text-2xl font-bold">
                      {waterHistory.length > 0 ? Math.min(...waterHistory.map(item => item.level)) : 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Critical Events</div>
                    <div className="text-2xl font-bold">
                      {waterHistory.filter(item => item.level > 85).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Waste Bin History Tab */}
        <TabsContent value="waste-history">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base font-medium">Waste Bin History</CardTitle>
              <CardDescription>24-hour bin fullness and weight</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={binHistory.map(item => ({
                      name: formatDate(item.timestamp),
                      fullness: item.fullness,
                      weight: item.weight,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="fullness" 
                      fill="#10b981" 
                      name="Bin Fullness (%)" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="weight" 
                      fill="#8884d8" 
                      name="Weight (kg)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Critical Points</CardTitle>
                <CardDescription>Times when bin fullness exceeded critical threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {binHistory.filter(item => item.fullness > 85).length > 0 ? (
                    binHistory
                      .filter(item => item.fullness > 85)
                      .map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded-md">
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                            <span className="text-sm">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div>
                            <span className="font-medium text-destructive mr-2">{item.fullness}%</span>
                            <span className="text-sm text-gray-500">{item.weight}kg</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
                      <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                      <span className="text-sm text-gray-500">No critical events recorded</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Statistics</CardTitle>
                <CardDescription>Summary of waste bin data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Average Fullness</div>
                    <div className="text-2xl font-bold">
                      {binHistory.length > 0 ? Math.round(binHistory.reduce((acc, item) => acc + item.fullness, 0) / binHistory.length) : 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Average Weight</div>
                    <div className="text-2xl font-bold">
                      {binHistory.length > 0 ? Math.round(binHistory.reduce((acc, item) => acc + item.weight, 0) / binHistory.length) : 0} kg
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Max Fullness</div>
                    <div className="text-2xl font-bold">
                      {binHistory.length > 0 ? Math.max(...binHistory.map(item => item.fullness)) : 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Max Weight</div>
                    <div className="text-2xl font-bold">
                      {binHistory.length > 0 ? Math.max(...binHistory.map(item => item.weight)) : 0} kg
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Correlation Analysis</CardTitle>
                <CardDescription>Relationship between water level and waste bin data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={waterHistory.map((item, index) => ({
                        name: formatDate(item.timestamp),
                        waterLevel: item.level,
                        binFullness: binHistory[index]?.fullness || 0,
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="waterLevel" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Water Level (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="binFullness" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Bin Fullness (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Analysis Insights</h4>
                  <p className="text-sm text-gray-700">
                    {waterHistory.length > 0 && binHistory.length > 0 
                      ? "Data shows a possible correlation between increased water levels and waste bin fullness. This may indicate that higher water flow is associated with more solid waste in the system."
                      : "Insufficient data to perform correlation analysis."}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Device Performance</CardTitle>
                <CardDescription>Efficiency and reliability metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sensor Reliability</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Water Sensor</span>
                          <Badge variant="outline" className="bg-white">98%</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="h-2 bg-blue-500 rounded-full" style={{ width: "98%" }}></div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Waste Sensor</span>
                          <Badge variant="outline" className="bg-white">95%</Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div className="h-2 bg-green-500 rounded-full" style={{ width: "95%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Battery Status</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">Battery Level</span>
                        <Badge variant="outline" className="bg-white">83%</Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className="h-2.5 bg-blue-500 rounded-full" style={{ width: "83%" }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Estimated remaining battery life: 45 days
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Maintenance Schedule</h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Gauge className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm">Next inspection</span>
                        </div>
                        <Badge variant="outline">7 days</Badge>
                      </div>
                      <div className="mt-2 border-t pt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Trash className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm">Next bin emptying</span>
                          </div>
                          <Badge variant="outline" className={wasteBin?.fullness && wasteBin.fullness > 85 ? "text-destructive" : ""}>
                            {wasteBin?.fullness && wasteBin.fullness > 85 ? "Urgent" : "2 days"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">System Recommendations</CardTitle>
              <CardDescription>Optimize your DrainSentry deployment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    Operational Insights
                  </h4>
                  <ul className="space-y-2">
                    {getRecommendations().map((recommendation, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Key Performance Indicators</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Data transmission</span>
                          <span className="text-sm font-medium">99.7%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: "99.7%" }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Sensor accuracy</span>
                          <span className="text-sm font-medium">96.5%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: "96.5%" }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Power efficiency</span>
                          <span className="text-sm font-medium">94.2%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: "94.2%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">System Health</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                        <div className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">Network connectivity</span>
                        </div>
                        <Badge variant="outline" className="bg-white text-green-500">Good</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                        <div className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">Power supply</span>
                        </div>
                        <Badge variant="outline" className="bg-white text-green-500">Stable</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-md">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-warning mr-2" />
                          <span className="text-sm">Calibration</span>
                        </div>
                        <Badge variant="outline" className="bg-white text-warning">Check soon</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}