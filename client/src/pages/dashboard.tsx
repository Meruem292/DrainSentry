import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
  ChevronRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WaterLevel, WasteBin, Device } from "@/types";
import { Link } from "wouter";
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
  Area,
  AreaChart,
  Bar,
  BarChart
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState<WaterLevel[]>([]);
  const [wasteData, setWasteData] = useState<WasteBin[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const waterLevelsRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteBinsRef = ref(database, `users/${user.uid}/wasteBins`);
    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    // Get water level data
    const waterUnsubscribe = onValue(waterLevelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const waterLevels = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any)
        }));
        setWaterData(waterLevels);
      } else {
        setWaterData([]);
      }
      setLoading(false);
    });
    
    // Get waste bin data
    const wasteUnsubscribe = onValue(wasteBinsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const wasteBins = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any)
        }));
        setWasteData(wasteBins);
      } else {
        setWasteData([]);
      }
    });
    
    // Get device data
    const devicesUnsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const devicesList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any)
        }));
        setDevices(devicesList);
      } else {
        setDevices([]);
      }
    });
    
    return () => {
      waterUnsubscribe();
      wasteUnsubscribe();
      devicesUnsubscribe();
    };
  }, [user]);

  const totalWaterSensors = waterData.length;
  const totalBins = wasteData.length;
  const criticalStations = waterData.filter(station => station.level > 85).length;
  const criticalBins = wasteData.filter(bin => bin.fullness > 85).length;
  const totalDevices = devices.length;
  
  // Calculate active devices based on recent data updates (last 5 minutes)
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const activeDevices = devices.filter(device => {
    const waterLevel = waterData.find(w => w.id === device.id);
    const wasteBin = wasteData.find(b => b.id === device.id);
    
    const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
    const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
    
    return (
      (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo) || 
      (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo)
    );
  }).length;

  // Helper function to get water level status color
  function getWaterLevelColor(level: number): string {
    if (level > 85) return "bg-destructive";
    if (level > 65) return "bg-warning";
    return "bg-success";
  }
  
  // Helper function to get bin fullness color
  function getBinFullnessColor(fullness: number): string {
    if (fullness > 85) return "bg-destructive";
    if (fullness > 60) return "bg-warning";
    return "bg-success";
  }
  
  // Generate sample chart data for the devices
  function generateSampleData(type: 'water' | 'waste', startValue: number) {
    const data = [];
    const hours = 24;
    
    let currentValue = startValue;
    
    for (let i = hours; i >= 0; i--) {
      if (type === 'water') {
        // Random fluctuation for water level (±7%)
        currentValue = Math.min(100, Math.max(0, currentValue + (Math.random() * 14 - 7)));
      } else {
        // Waste bin data tends to increase over time (0-5% increase per hour)
        currentValue = Math.min(100, Math.max(0, currentValue + (Math.random() * 5)));
      }
      
      const time = new Date();
      time.setHours(time.getHours() - i);
      
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: Math.round(currentValue),
      });
    }
    
    return data;
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Monitor your infrastructure in real-time">
      <div className="grid gap-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDevices}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="text-success font-medium">{activeDevices}</span> active devices
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Water Level Sensors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWaterSensors}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className={criticalStations > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                  {criticalStations}
                </span> critical stations
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Waste Bin Monitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBins}</div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className={criticalBins > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                  {criticalBins}
                </span> bins need emptying
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Online</div>
              <div className="text-xs text-muted-foreground mt-1">
                All systems operational
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        {devices.length === 0 && !loading ? (
          <Card className="bg-white rounded-lg shadow-sm p-8 mb-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Info className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No devices found</h3>
            <p className="text-gray-500 text-center mb-6">Add devices to start monitoring your infrastructure.</p>
            
            <Link href="/devices">
              <Button>Add Your First Device</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* Summary Cards for Water Monitoring and Waste Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Droplet className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{waterData.length}</h3>
                        <p className="text-sm text-gray-500">Monitoring points</p>
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-600 px-3 py-1">
                      {criticalStations > 0 ? `${criticalStations} critical` : 'All normal'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{wasteData.length}</h3>
                        <p className="text-sm text-gray-500">Monitored bins</p>
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-600 px-3 py-1">
                      {criticalBins > 0 ? `${criticalBins} need attention` : 'All normal'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Device Cards - One card per device showing all sensors */}
            <h2 className="text-lg font-medium text-gray-800 mt-2">Device Readings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device, index) => {
                // Find the associated water level and waste bin data
                const waterLevel = waterData.find(w => w.id === device.id);
                const wasteBin = wasteData.find(w => w.id === device.id);
                
                // Check if device is active (updated in the last 5 minutes)
                const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
                const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
                
                // Device is active if any sensor has been updated in the last 5 minutes
                const isActive = (
                  (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo) ||
                  (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo)
                );
                
                // Generate sample chart data for water level
                const waterChartData = generateSampleData('water', waterLevel?.level || 0);
                
                return (
                  <motion.div 
                    key={device.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="col-span-1"
                  >
                    <Card className="h-full border hover:border-primary hover:shadow-md transition-all duration-300">
                      <CardHeader className="pb-2 border-b">
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
                            <CardTitle className="text-base font-medium">{device.name}</CardTitle>
                          </div>
                          <Badge 
                            variant={isActive ? "default" : "outline"}
                            className={isActive ? "" : "bg-gray-100 text-gray-500"}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center mt-1">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {device.location}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          {/* Water Level Section */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium flex items-center">
                                <Droplet className="h-4 w-4 text-blue-500 mr-1" />
                                Water Level
                              </span>
                              <Badge className={`
                                ${
                                  (waterLevel?.level || 0) > 85 ? 'bg-red-50 text-red-500' : 
                                  (waterLevel?.level || 0) > 65 ? 'bg-amber-50 text-amber-500' : 
                                  'bg-green-50 text-green-500'
                                }`}
                              >
                                {(waterLevel?.level || 0) > 85 ? "Critical" : (waterLevel?.level || 0) > 65 ? "Warning" : "Normal"}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-500">Current Level</span>
                              <span className="text-sm font-medium">{waterLevel?.level || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
                              <div 
                                className={`h-2.5 rounded-full ${getWaterLevelColor(waterLevel?.level || 0)}`} 
                                style={{ width: `${waterLevel?.level || 0}%` }}
                              ></div>
                            </div>
                            <div className="h-16 w-full mb-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={waterChartData}>
                                  <defs>
                                    <linearGradient id={`colorWater${index}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke="#0ea5e9" 
                                    fillOpacity={1} 
                                    fill={`url(#colorWater${index})`} 
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <CalendarClock className="h-3.5 w-3.5 mr-1" />
                              <span>Last update: {
                                lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo
                                  ? "< 5 minutes ago" 
                                  : waterLevel?.lastUpdated || "Never"
                              }</span>
                            </div>
                          </div>
                          
                          {/* Divider */}
                          <div className="h-px bg-gray-100 w-full"></div>
                          
                          {/* Waste Bin Section */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium flex items-center">
                                <Trash2 className="h-4 w-4 text-emerald-500 mr-1" />
                                Waste Bin
                              </span>
                              <Badge className={`
                                ${
                                  (wasteBin?.fullness || 0) > 85 ? 'bg-red-50 text-red-500' : 
                                  (wasteBin?.fullness || 0) > 60 ? 'bg-amber-50 text-amber-500' : 
                                  'bg-green-50 text-green-500'
                                }`}
                              >
                                {(wasteBin?.fullness || 0) > 85 ? "Full" : (wasteBin?.fullness || 0) > 60 ? "Warning" : "Empty"}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-2">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500">Fullness</span>
                                  <span className="text-sm font-medium">{wasteBin?.fullness || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                  <div 
                                    className={`h-2.5 rounded-full ${getBinFullnessColor(wasteBin?.fullness || 0)}`} 
                                    style={{ width: `${wasteBin?.fullness || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500">Weight</span>
                                  <span className="text-sm font-medium">{wasteBin?.weight || 0} kg</span>
                                </div>
                                <div className="flex items-center">
                                  <Scale className="h-4 w-4 text-blue-500 mr-1" />
                                  <span className="text-xs text-gray-500">Capacity: 100kg</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500 flex items-center">
                              <CalendarClock className="h-3.5 w-3.5 mr-1" />
                              <span>Last emptied: {
                                lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo
                                  ? "< 5 minutes ago" 
                                  : wasteBin?.lastEmptied || "Never"
                              }</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="pt-0 border-t mt-4">
                        <Link href={`/devices/${device.id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full">
                            View Detailed Analytics
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}