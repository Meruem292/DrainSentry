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
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState<WaterLevel[]>([]);
  const [wasteData, setWasteData] = useState<WasteBin[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const waterRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteRef = ref(database, `users/${user.uid}/wasteBins`);
    const devicesRef = ref(database, `users/${user.uid}/devices`);

    // Subscribe to water data
    const waterUnsubscribe = onValue(waterRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const waterLevels = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setWaterData(waterLevels);
      } else {
        setWaterData([]);
      }
      setLoading(false);
    });

    // Subscribe to waste data
    const wasteUnsubscribe = onValue(wasteRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const wasteBins = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setWasteData(wasteBins);
      } else {
        setWasteData([]);
      }
    });

    // Subscribe to devices data
    const devicesUnsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const deviceList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        }));
        setDevices(deviceList);
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

  // Generate sample history data for charts
  function generateSampleData(type: 'water' | 'waste', startValue: number) {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      
      // Create some variations for the chart
      let value = startValue;
      if (i % 7 === 0) value = Math.max(0, startValue - 10 - Math.random() * 15);
      if (i % 5 === 0) value = Math.min(100, startValue + 5 + Math.random() * 10);
      
      data.push({
        date: dayStr,
        value: Math.round(value + (Math.random() * 10 - 5)),
      });
    }
    return data;
  }

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Monitor your DrainSentry network"
    >
      {!loading && devices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <InfoIcon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Devices Added</h3>
          <p className="text-gray-500 text-center mb-6">
            You haven't added any monitoring devices to your DrainSentry network yet.
          </p>
          <Link href="/devices">
            <Button>
              Add Your First Device
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-primary/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
                  <div className="flex items-center">
                    <Droplet className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Water Monitoring</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-800">{totalWaterSensors}</div>
                      <div className="text-xs text-gray-500 mt-1">Monitoring points</div>
                    </div>
                    <Badge variant={criticalStations > 0 ? "destructive" : "outline"} className={criticalStations > 0 ? "" : "bg-blue-50 text-primary"}>
                      {criticalStations > 0 ? `${criticalStations} critical` : "All normal"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-green-600/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-transparent">
                  <div className="flex items-center">
                    <Trash2 className="h-5 w-5 text-green-600 mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Waste Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-800">{totalBins}</div>
                      <div className="text-xs text-gray-500 mt-1">Monitored bins</div>
                    </div>
                    <Badge variant={criticalBins > 0 ? "destructive" : "outline"} className={criticalBins > 0 ? "" : "bg-green-50 text-green-600"}>
                      {criticalBins > 0 ? `${criticalBins} critical` : "All normal"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-amber-500/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-transparent">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-amber-500 mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Device Status</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-800">{totalDevices}</div>
                      <div className="text-xs text-gray-500 mt-1">Total devices</div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-500">
                      {activeDevices} active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Device Cards */}
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4">Device Status & Readings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Water Level Sensor Cards */}
              {waterData.map((station, index) => {
                // Find matching device
                const matchingDevice = devices.find(device => device.id === station.id);
                const chartData = generateSampleData('water', station.level);
                
                return (
                  <motion.div
                    key={station.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + (index * 0.03) }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="border-2 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getWaterLevelColor(station.level)}`}></div>
                            <CardTitle className="text-base font-medium text-gray-800">
                              {station.location || station.id}
                            </CardTitle>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${
                              station.level > 85 ? 'bg-red-50 text-red-500' : 
                              station.level > 65 ? 'bg-amber-50 text-amber-500' : 
                              'bg-green-50 text-green-500'
                            }`}
                          >
                            {station.level > 85 ? "Critical" : station.level > 65 ? "Warning" : "Normal"}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center mt-1 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          Water Level Sensor
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-2">
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-500">Current Water Level</span>
                            <span className="text-sm font-medium">{station.level}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full ${getWaterLevelColor(station.level)}`} 
                              style={{ width: `${station.level}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="h-24 w-full mb-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id={`colorWater${index}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3b82f6" 
                                fillOpacity={1} 
                                fill={`url(#colorWater${index})`} 
                              />
                              <XAxis dataKey="date" hide={true} />
                              <YAxis hide={true} domain={[0, 100]} />
                              <Tooltip 
                                labelFormatter={value => `Date: ${value}`}
                                formatter={value => [`${value}%`, "Water Level"]}
                                contentStyle={{ fontSize: '12px' }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between pt-0">
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarClock className="h-3.5 w-3.5 mr-1" />
                          Last updated: {station.lastUpdated || 'Unknown'}
                        </div>
                        
                        <Link href={`/water-levels/${station.id}`} className="text-xs text-primary flex items-center">
                          View Details <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
              
              {/* Waste Bin Sensor Cards */}
              {wasteData.map((bin, index) => {
                // Find matching device
                const matchingDevice = devices.find(device => device.id === bin.id);
                const chartData = generateSampleData('waste', bin.fullness);
                
                return (
                  <motion.div
                    key={bin.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + ((index + waterData.length) * 0.03) }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="border-2 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-transparent">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getBinFullnessColor(bin.fullness)}`}></div>
                            <CardTitle className="text-base font-medium text-gray-800">
                              {bin.location || bin.id}
                            </CardTitle>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${
                              bin.fullness > 85 ? 'bg-red-50 text-red-500' : 
                              bin.fullness > 60 ? 'bg-amber-50 text-amber-500' : 
                              'bg-green-50 text-green-500'
                            }`}
                          >
                            {bin.fullness > 85 ? "Full" : bin.fullness > 60 ? "Warning" : "Empty"}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center mt-1 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          Waste Bin Monitor
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-2">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-500">Fullness</span>
                              <span className="text-sm font-medium">{bin.fullness}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div 
                                className={`h-2.5 rounded-full ${getBinFullnessColor(bin.fullness)}`} 
                                style={{ width: `${bin.fullness}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-500">Weight</span>
                              <span className="text-sm font-medium">{bin.weight} kg</span>
                            </div>
                            <div className="flex items-center">
                              <Scale className="h-4 w-4 text-blue-500 mr-1" />
                              <span className="text-xs text-gray-500">Capacity: 100kg</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="h-24 w-full mb-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.slice(-14)} barSize={10}>
                              <XAxis dataKey="date" hide={true} />
                              <YAxis hide={true} domain={[0, 100]} />
                              <Tooltip 
                                labelFormatter={value => `Date: ${value}`}
                                formatter={value => [`${value}%`, "Bin Fullness"]}
                                contentStyle={{ fontSize: '12px' }}
                              />
                              <Bar 
                                dataKey="value" 
                                radius={[10, 10, 0, 0]}
                                fill={(entry, index) => {
                                  const value = entry.value;
                                  return value > 85 ? '#ef4444' : value > 60 ? '#f97316' : '#10b981';
                                }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="flex justify-between pt-0">
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarClock className="h-3.5 w-3.5 mr-1" />
                          Last emptied: {bin.lastEmptied || 'Unknown'}
                        </div>
                        
                        <Link href={`/waste-bins/${bin.id}`} className="text-xs text-emerald-600 flex items-center">
                          View Details <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}