import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Clock, 
  Droplet, 
  Activity, 
  AlertTriangle, 
  CalendarClock, 
  ChevronRight 
} from "lucide-react";
import { WaterLevel } from "@/types";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";

// Helper functions for water level status
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

function getStationColor(index: number): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  return colors[index % colors.length];
}

export default function WaterLevels() {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState<WaterLevel[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7days");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const waterRef = ref(database, `users/${user.uid}/waterLevels`);
    const historyRef = ref(database, `users/${user.uid}/waterLevelHistory`);

    // Subscribe to water level data
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

    // Subscribe to history data
    const historyUnsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHistoryData(Object.entries(data).map(([date, value]) => ({
          date,
          ...(value as any),
        })));
      } else {
        setHistoryData([]);
      }
    });

    return () => {
      waterUnsubscribe();
      historyUnsubscribe();
    };
  }, [user]);

  // Filter and prepare chart data
  const chartData = useMemo(() => {
    if (!historyData.length) return [];
    
    let filtered = [...historyData];
    
    // Apply station filter
    if (selectedStation !== "all") {
      filtered = filtered.filter(item => item[selectedStation] !== undefined);
    }
    
    // Apply time range filter
    if (timeRange === "7days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(item => new Date(item.date) >= sevenDaysAgo);
    } else if (timeRange === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(item => new Date(item.date) >= thirtyDaysAgo);
    } else if (timeRange === "90days") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      filtered = filtered.filter(item => new Date(item.date) >= ninetyDaysAgo);
    }
    
    // Sort by date
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return filtered;
  }, [historyData, timeRange, selectedStation]);

  return (
    <DashboardLayout 
      title="Water Levels" 
      subtitle="Monitor water levels across all your stations"
    >
      {waterData.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Monitoring Stations</h3>
          <p className="text-gray-500 text-center mb-6">There are currently no water level monitoring stations available.</p>
          <Link href="/devices">
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Add New Station
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          {waterData.length > 0 && (
            <div className="mb-8">
              <div className="grid gap-4 md:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 hover:border-primary/70 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
                      <div className="flex items-center">
                        <Activity className="h-5 w-5 text-primary mr-2" />
                        <CardTitle className="text-sm font-medium">Average Water Level</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.round(waterData.reduce((sum, level) => sum + level.level, 0) / waterData.length)}%
                      </div>
                      <p className="text-xs text-gray-500">Across all monitoring stations</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="border-2 hover:border-red-500/70 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-red-50 to-transparent">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <CardTitle className="text-sm font-medium">Critical Stations</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {waterData.filter(station => station.level > 85).length}
                      </div>
                      <p className="text-xs text-gray-500">Stations with critical water levels</p>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="border-2 hover:border-green-500/70 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-transparent">
                      <div className="flex items-center">
                        <Droplet className="h-5 w-5 text-green-600 mr-2" />
                        <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{waterData.length}</div>
                      <p className="text-xs text-gray-500">Active monitoring devices</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          )}
          
          {/* Device Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {waterData.map((station, index) => (
              <motion.div
                key={station.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + (index * 0.05) }}
                whileHover={{ scale: 1.02 }}
              >
                <Link href={`/water-levels/${station.id}`} className="block h-full">
                  <Card className="h-full border-2 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
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
                          {getWaterLevelStatus(station.level)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-2">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Water Level</span>
                          <span className="text-sm font-medium">{station.level}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full ${getWaterLevelColor(station.level)}`} 
                            style={{ width: `${station.level}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          <span>{station.lastUpdated || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center text-xs text-primary">
                          <span>View Details</span>
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Water Level History Section */}
          {waterData.length > 0 && historyData.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Water Level History</CardTitle>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Select
                      value={selectedStation}
                      onValueChange={setSelectedStation}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="All Stations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stations</SelectItem>
                        {waterData.map(station => (
                          <SelectItem key={station.id} value={station.id}>
                            {station.location || station.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={timeRange}
                      onValueChange={setTimeRange}
                    >
                      <SelectTrigger className="w-full md:w-32">
                        <SelectValue placeholder="7 Days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7days">7 Days</SelectItem>
                        <SelectItem value="30days">30 Days</SelectItem>
                        <SelectItem value="90days">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value) => [`${value}%`, "Water Level"]}
                      />
                      <Legend />
                      
                      {selectedStation === "all"
                        ? waterData.map((station, index) => (
                            <Line
                              key={station.id}
                              type="monotone"
                              dataKey={station.id}
                              name={station.location || station.id}
                              stroke={`var(--chart-${index % 6 + 1})`}
                              activeDot={{ r: 8 }}
                            />
                          ))
                        : (
                            <Line
                              type="monotone"
                              dataKey={selectedStation}
                              name={waterData.find(s => s.id === selectedStation)?.location || selectedStation}
                              stroke="#2196F3"
                              activeDot={{ r: 8 }}
                            />
                          )
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}