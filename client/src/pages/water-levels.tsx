import { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast, orderByKey } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { 
  Droplet, 
  Trash, 
  Scale, 
  CalendarClock, 
  MapPin,
  Clock,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { Device, WaterLevel, WasteBin } from "@/types";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

export default function WaterLevels() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [waterLevels, setWaterLevels] = useState<Record<string, WaterLevel>>({});
  const [wasteBins, setWasteBins] = useState<Record<string, WasteBin>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    const waterLevelsRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteBinsRef = ref(database, `users/${user.uid}/wasteBins`);
    
    // Get all devices
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
    };
  }, [user]);

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

  // Generate sample water level history data for analytics
  function generateWaterLevelData(deviceId: string, days: number = 7) {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      
      // Generate random data or base it on the current value if it exists
      const waterLevel = waterLevels[deviceId]?.level || 0;
      const baseValue = waterLevel > 0 ? waterLevel : 50;
      const value = baseValue + Math.floor(Math.random() * 20) - 10;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        level: Math.max(0, Math.min(100, value))
      });
    }
    
    return data.reverse();
  }

  // Calculate average of water levels across all devices
  const averageWaterLevel = Object.values(waterLevels).length > 0 
    ? Math.round(Object.values(waterLevels).reduce((sum, water) => sum + (water.level || 0), 0) / Object.values(waterLevels).length) 
    : 0;

  return (
    <DashboardLayout 
      title="Water Level Monitoring" 
      subtitle="Real-time sewer water level analytics"
    >
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-800">Water Level Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">
          Monitor sewer water levels across all your connected devices
        </p>
      </div>
      
      {/* Water level overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Total Monitoring Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{devices.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {devices.filter(d => {
                const waterLevel = waterLevels[d.id];
                const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
                return (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo);
              }).length} active
            </p>
          </CardContent>
        </Card>
        
        <Card className={`animated-card slide-in hover-scale ${
          averageWaterLevel > 85 
            ? "danger-card" 
            : averageWaterLevel > 65 
            ? "warning-card" 
            : "success-card"
          }`} style={{animationDelay: '0.05s'}}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Average Water Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              averageWaterLevel > 85 
                ? "text-destructive" 
                : averageWaterLevel > 65 
                ? "text-warning" 
                : "text-success"
            }`}>{averageWaterLevel}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full ${
                  averageWaterLevel > 85 ? "bg-destructive" : 
                  averageWaterLevel > 65 ? "bg-warning" : 
                  "bg-success"
                }`} 
                style={{ width: `${averageWaterLevel}%`, transition: 'width 0.5s ease-in-out' }}
              ></div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`animated-card slide-in ${Object.values(waterLevels).filter(water => water.level > 85).length > 0 ? 'danger-card' : 'success-card'}`} style={{animationDelay: '0.1s'}}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Critical Stations</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-3xl font-bold ${Object.values(waterLevels).filter(water => water.level > 85).length > 0 ? 'text-destructive' : 'text-success'}`}>
              {Object.values(waterLevels).filter(water => water.level > 85).length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {Object.values(waterLevels).filter(water => water.level > 85).length > 0 ? (
                <span className="text-destructive">Requires attention</span>
              ) : (
                "All normal"
              )}
            </p>
            {Object.values(waterLevels).filter(water => water.level > 85).length > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 pulse-animation"></div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Water level chart */}
      {devices.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">Water Level Trends</CardTitle>
            <CardDescription>7-day water level history across all stations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={generateWaterLevelData(devices[0]?.id || '', 7)}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Water Level']} />
                  <Area 
                    type="monotone" 
                    dataKey="level" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorLevel)" 
                    name="Water Level"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      
      {devices.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Droplet className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No devices found</h3>
          <p className="text-gray-500 text-center mb-6">
            Add devices from the Devices page to start monitoring.
          </p>
          
          <Link href="/devices">
            <Button>
              Go to Devices
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Only display devices that have water level data - prevents redundant cards */}
          {devices.filter(device => waterLevels[device.id]).map((device, index) => {
            const waterLevel = waterLevels[device.id];
            const wasteBin = wasteBins[device.id];
            
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
                transition={{ duration: 0.4, delay: 0.05 * index }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setLocation(`/water-levels/${device.id}`)}
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
                            <Trash className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                        <CardTitle className="text-base font-medium text-gray-800">
                          {device.name}
                        </CardTitle>
                      </div>
                      <Badge 
                        variant={isActive ? "default" : "outline"}
                        className={isActive ? "" : "bg-gray-100 text-gray-500"}
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
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">Water Level</span>
                        <Badge variant="outline" className={getWaterLevelTextColor(waterLevel?.level || 0)}>
                          {getWaterLevelStatus(waterLevel?.level || 0)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1">
                        <div 
                          className={`h-2.5 rounded-full ${getWaterLevelColor(waterLevel?.level || 0)}`} 
                          style={{ width: `${waterLevel?.level || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Current: {waterLevel?.level || 0}%</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {waterLevel?.lastUpdated || 'Never'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Bin Fullness</span>
                          <span className="text-xs font-medium">{wasteBin?.fullness || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-1">
                          <div 
                            className={`h-2.5 rounded-full ${getBinFullnessColor(wasteBin?.fullness || 0)}`} 
                            style={{ width: `${wasteBin?.fullness || 0}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Badge variant="outline" className={getBinTextColor(wasteBin?.fullness || 0)}>
                            {getBinStatus(wasteBin?.fullness || 0)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Weight</span>
                          <span className="text-sm font-medium">{wasteBin?.weight || 0} kg</span>
                        </div>
                        <div className="flex items-center gap-1 mb-1">
                          <Scale className="h-4 w-4 text-blue-500" />
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-2 rounded-full bg-blue-500" 
                              style={{ width: `${Math.min((wasteBin?.weight || 0) / 100 * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-end text-xs text-gray-500">
                          Max capacity: 100kg
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between border-t pt-2 pb-2 bg-gray-50">
                    <div className="flex items-center text-xs text-gray-500">
                      <CalendarClock className="h-3.5 w-3.5 mr-1" />
                      Last seen: {device.lastSeen}
                    </div>
                    
                    <div className="flex items-center text-primary text-sm">
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}