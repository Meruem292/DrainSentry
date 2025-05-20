import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import { WaterLevel } from "@/types";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
        // Convert the history data into a format suitable for charts
        const formattedData = Object.entries(data).map(([date, stations]: [string, any]) => {
          const entry: any = { date };
          
          if (stations) {
            Object.entries(stations).forEach(([stationId, value]) => {
              entry[stationId] = value;
            });
          }
          
          return entry;
        });
        
        setHistoryData(formattedData);
      } else {
        setHistoryData([]);
      }
    });

    return () => {
      waterUnsubscribe();
      historyUnsubscribe();
    };
  }, [user]);

  // Filter history data based on selected time range and station
  const filteredHistoryData = useMemo(() => {
    if (!historyData.length) return [];
    
    let filtered = [...historyData];
    
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
  }, [historyData, timeRange]);

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
          {waterData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle>Current Water Levels</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pt-0 space-y-4">
                {waterData.map(station => (
                  <div key={station.id} className="mb-4 last:mb-0">
                    <div className="flex justify-between mb-1">
                      <Link href={`/water-levels/${station.id}`}>
                        <a className="text-sm font-medium text-primary hover:underline">
                          {station.location || station.id}
                        </a>
                      </Link>
                      <span className="text-sm font-medium">{station.level}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getWaterLevelColor(station.level)}`} 
                        style={{ width: `${station.level}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">Last updated: {station.lastUpdated || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${getWaterLevelTextColor(station.level)}`}>
                          {getWaterLevelStatus(station.level)}
                        </span>
                        <Link href={`/water-levels/${station.id}`}>
                          <a className="text-xs text-primary hover:underline">View Details</a>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </div>
          )}
        </div>
      )}
      
      {/* Water Level History Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Water Level History</CardTitle>
            <div className="flex gap-2">
              <Select 
                value={selectedStation} 
                onValueChange={setSelectedStation}
              >
                <SelectTrigger className="w-32 md:w-40">
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
                <SelectTrigger className="w-32 md:w-40">
                  <SelectValue placeholder="Last 7 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredHistoryData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Water Level']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  
                  {waterData.map((station, index) => {
                    if (selectedStation === "all" || selectedStation === station.id) {
                      return (
                        <Line 
                          key={station.id}
                          type="monotone" 
                          dataKey={station.id} 
                          name={station.location || station.id}
                          stroke={getStationColor(index)}
                          activeDot={{ r: 8 }}
                        />
                      );
                    }
                    return null;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              {loading ? "Loading data..." : "No historical data available"}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

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
  const colors = ["#2196F3", "#4CAF50", "#FFC107", "#F44336", "#9C27B0"];
  return colors[index % colors.length];
}
