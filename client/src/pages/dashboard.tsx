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
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Plus
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
  Legend
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [waterData, setWaterData] = useState<Record<string, WaterLevel>>({});
  const [wasteData, setWasteData] = useState<Record<string, WasteBin>>({});
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

  const totalDevices = devices.length;
  
  // Calculate active devices based on recent data updates (last 5 minutes)
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  const activeDevices = devices.filter(device => {
    const waterLevel = waterData[device.id];
    const wasteBin = wasteData[device.id];
    
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

  // Count critical devices
  const criticalWaterLevels = Object.values(waterData).filter(water => water.level > 85).length;
  const criticalBins = Object.values(wasteData).filter(bin => bin.fullness > 85).length;

  // Generate sample data for charts
  function generateSampleData(type: 'water' | 'waste', startValue: number) {
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      
      const value = startValue + Math.floor(Math.random() * 15) - 5;
      data.push({
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.max(0, Math.min(100, value))
      });
    }
    
    return data;
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="DrainSentry system overview">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="animated-card hover-scale fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDevices}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {activeDevices} active
            </p>
          </CardContent>
        </Card>
        
        <Card className={`animated-card slide-in ${criticalWaterLevels > 0 ? 'danger-card' : 'success-card'}`} style={{animationDelay: '0.05s'}}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Critical Water Levels</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-3xl font-bold ${criticalWaterLevels > 0 ? 'text-destructive' : 'text-success'}`}>
              {criticalWaterLevels}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {criticalWaterLevels > 0 ? (
                <span className="text-destructive">Requires attention</span>
              ) : (
                "All normal"
              )}
            </p>
            {criticalWaterLevels > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 pulse-animation"></div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Critical Waste Bins</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">{criticalBins}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {criticalBins > 0 ? (
                <span className="text-destructive">Need emptying</span>
              ) : (
                "All normal"
              )}
            </p>
            {criticalBins > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            )}
          </CardContent>
        </Card>
        
        <Card className={`${criticalWaterLevels + criticalBins > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {criticalWaterLevels + criticalBins > 0 ? (
                <>
                  <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
                  <div>
                    <div className="text-lg font-medium">Attention Required</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {criticalWaterLevels + criticalBins} issues need your attention
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <div className="text-lg font-medium">All Systems Normal</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Network status: online
                    </p>
                  </div>
                </>
              )}
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
          <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200" onClick={() => setLocation('/devices')}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Plus className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-medium">Add Device</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200" onClick={() => setLocation('/water-levels')}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Droplet className="h-8 w-8 text-blue-500 mb-2" />
              <p className="text-sm font-medium">Water Levels</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200" onClick={() => setLocation('/waste-bins')}>
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <Trash2 className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">Waste Bins</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200" onClick={() => setLocation('/settings')}>
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
              You haven't added any devices to your DrainSentry system yet. Add your first device to start monitoring your infrastructure.
            </p>
            
            <Link href="/devices">
              <Button>
                Add Your First Device
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-8">
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Devices</TabsTrigger>
                <TabsTrigger value="alerts">Alerts ({criticalWaterLevels + criticalBins})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                <h2 className="text-lg font-medium mb-4">Device Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {devices.map((device, index) => {
                    const waterLevel = waterData[device.id];
                    const wasteBin = wasteData[device.id];
                    
                    // Check if device is active (updated in the last 5 minutes)
                    const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
                    const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
                    
                    // Device is active if any sensor has been updated in the last 5 minutes
                    const isActive = (
                      (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo) ||
                      (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo)
                    );
                    
                    return (
                      <motion.div 
                        key={device.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="col-span-1"
                        onClick={() => setLocation(`/water-level-details?id=${device.id}`)}
                      >
                        <Card className="h-full border-2 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base font-medium">{device.name}</CardTitle>
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
                          
                          <CardContent className="pb-3">
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500 flex items-center">
                                    <Droplet className="h-3.5 w-3.5 mr-1 text-blue-500" />
                                    Water Level
                                  </span>
                                  <span className="text-sm font-medium">{waterLevel?.level || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-2 rounded-full ${getWaterLevelColor(waterLevel?.level || 0)}`} 
                                    style={{ width: `${waterLevel?.level || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500 flex items-center">
                                    <Trash2 className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                                    Bin Fullness
                                  </span>
                                  <span className="text-sm font-medium">{wasteBin?.fullness || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-2 rounded-full ${getBinFullnessColor(wasteBin?.fullness || 0)}`} 
                                    style={{ width: `${wasteBin?.fullness || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm text-gray-500 flex items-center">
                                    <Scale className="h-3.5 w-3.5 mr-1 text-purple-500" />
                                    Weight
                                  </span>
                                  <span className="text-sm font-medium">{wasteBin?.weight || 0} kg</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-2 rounded-full bg-purple-500" 
                                    style={{ width: `${Math.min((wasteBin?.weight || 0) / 100 * 100, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-end">
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    {Math.min(Math.round((wasteBin?.weight || 0) / 100 * 100), 100)}% of capacity
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                          
                          <CardFooter className="pt-0 border-t flex justify-between items-center py-2">
                            <div className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Last updated: {
                                lastUpdatedWater && lastEmptiedBin ? 
                                  (new Date(Math.max(lastUpdatedWater.getTime(), lastEmptiedBin.getTime())).toLocaleString()) : 
                                  (lastUpdatedWater ? 
                                    new Date(lastUpdatedWater).toLocaleString() : 
                                    (lastEmptiedBin ? 
                                      new Date(lastEmptiedBin).toLocaleString() : 
                                      'Never'
                                    )
                                  )
                              }
                            </div>
                            <span className="text-sm text-blue-500 flex items-center">
                              View Details
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </span>
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
                      <h3 className="text-lg font-medium mb-1">All Systems Normal</h3>
                      <p className="text-center text-gray-500">
                        There are no critical alerts at this time.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((device, index) => {
                      const waterLevel = waterData[device.id];
                      const wasteBin = wasteData[device.id];
                      
                      // Only show critical devices
                      if ((waterLevel && waterLevel.level <= 85) && (wasteBin && wasteBin.fullness <= 85)) {
                        return null;
                      }
                      
                      // Check if device is active
                      const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
                      const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
                      
                      const isActive = (
                        (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo) ||
                        (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo)
                      );
                      
                      return (
                        <motion.div 
                          key={device.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          className="col-span-1"
                          onClick={() => setLocation(`/water-level-details?id=${device.id}`)}
                        >
                          <Card className="h-full border-2 border-red-200 hover:border-red-500 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                            <CardHeader className="pb-3 bg-red-50">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base font-medium">{device.name}</CardTitle>
                                <Badge 
                                  variant={isActive ? "destructive" : "outline"}
                                  className={isActive ? "" : "bg-gray-100 text-gray-500"}
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
                                      <Badge variant="destructive">{waterLevel.level}%</Badge>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="h-2 rounded-full bg-red-500" 
                                        style={{ width: `${waterLevel.level}%` }}
                                      ></div>
                                    </div>
                                    <div className="mt-1 text-xs text-red-500">
                                      Critical level detected - requires immediate attention
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
                                      <Badge variant="destructive">{wasteBin.fullness}%</Badge>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div 
                                        className="h-2 rounded-full bg-red-500" 
                                        style={{ width: `${wasteBin.fullness}%` }}
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
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Water Level Trends</CardTitle>
                <CardDescription>Average water levels over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={generateSampleData('water', 50)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Water Level']} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorWater)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Waste Bin Status</CardTitle>
                <CardDescription>Average bin fullness over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={generateSampleData('waste', 35)}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Bin Fullness']} />
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
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}