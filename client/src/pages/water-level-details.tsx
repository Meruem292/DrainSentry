import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft } from "lucide-react";
import { WaterLevel } from "@/types";
import { Link, useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

export default function WaterLevelDetails() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [stationId, setStationId] = useState("");
  const [stationData, setStationData] = useState<WaterLevel | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<string>("30days");
  const [loading, setLoading] = useState(true);

  // Extract device ID from URL
  useEffect(() => {
    const id = location.split("/").pop();
    if (id) {
      setStationId(id);
    }
  }, [location]);

  useEffect(() => {
    if (!user || !stationId) return;

    const stationRef = ref(database, `users/${user.uid}/waterLevels/${stationId}`);
    const historyRef = ref(database, `users/${user.uid}/waterLevelHistory`);
    
    // Subscribe to water level data
    const stationUnsubscribe = onValue(stationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStationData({
          id: stationId,
          ...data
        });
      } else {
        setStationData(null);
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
          
          if (stations && stations[stationId] !== undefined) {
            entry[stationId] = stations[stationId];
          }
          
          return entry;
        });
        
        setHistoryData(formattedData);
      } else {
        setHistoryData([]);
      }
    });

    return () => {
      stationUnsubscribe();
      historyUnsubscribe();
    };
  }, [user, stationId]);

  // Filter history data based on selected time range
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

  // Calculate some statistics 
  const stats = useMemo(() => {
    if (!filteredHistoryData.length || !stationId) return { avg: 0, max: 0, min: 0, current: 0 };
    
    const values = filteredHistoryData
      .map(item => item[stationId])
      .filter(value => value !== undefined && value !== null);
    
    if (!values.length) return { avg: 0, max: 0, min: 0, current: 0 };
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = Math.round(sum / values.length);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const current = stationData?.level || 0;
    
    return { avg, max, min, current };
  }, [filteredHistoryData, stationId, stationData]);

  // Get trend data for small charts
  const getTrendData = () => {
    if (!filteredHistoryData.length) return [];
    
    // Get the last 7 data points
    const recentData = [...filteredHistoryData].slice(-7);
    
    return recentData.map(item => ({
      date: item.date,
      value: item[stationId] || 0
    }));
  };

  return (
    <DashboardLayout 
      title={stationData?.location || "Water Level Details"} 
      subtitle="Detailed monitoring data for this water level station"
    >
      <div className="mb-6">
        <Link href="/water-levels" className="inline-block">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Water Levels
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !stationData ? (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Info className="h-5 w-5 text-yellow-600" />
          <AlertDescription>
            Station not found or data unavailable.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Current Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.current}%</div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getWaterLevelColor(stats.current)}`} 
                      style={{ width: `${stats.current}%` }}
                    ></div>
                  </div>
                  <div className="text-xs mt-1 text-gray-500">Last updated: {stationData.lastUpdated}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Average Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avg}%</div>
                <div className="mt-2 h-10">
                  {getTrendData().length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getTrendData()} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#2196F3" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Maximum Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.max}%</div>
                <div className="mt-2 text-xs text-gray-500">
                  {getWaterLevelStatus(stats.max)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Minimum Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.min}%</div>
                <div className="mt-2 text-xs text-gray-500">
                  {getWaterLevelStatus(stats.min)}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main chart */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Water Level History</CardTitle>
                <div className="flex gap-2">
                  <Select 
                    value={timeRange} 
                    onValueChange={setTimeRange}
                  >
                    <SelectTrigger className="w-32 md:w-40">
                      <SelectValue placeholder="Last 30 days" />
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
                    <AreaChart data={filteredHistoryData}>
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
                      <defs>
                        <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey={stationId} 
                        name={stationData.location || stationId} 
                        stroke="#2196F3"
                        fillOpacity={1}
                        fill="url(#colorLevel)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  {loading ? "Loading data..." : "No historical data available"}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Status and analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Station Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="mr-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusBackground(stats.current)}`}>
                      <Info className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">Current Status</h3>
                    <p className="text-gray-600">
                      This station is currently reporting a water level of <strong>{stats.current}%</strong>, which is considered{' '}
                      <span className={getWaterLevelTextColor(stats.current)}><strong>{getWaterLevelStatus(stats.current).toLowerCase()}</strong></span>.
                      {stats.current > 75 && ' Immediate attention may be required.'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Trend Analysis</h3>
                  <p className="text-gray-600 mb-4">
                    {getTrendAnalysis(stats.current, filteredHistoryData, stationId)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    {getRecommendations(stats.current, stats.avg)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
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

function getStatusBackground(level: number): string {
  if (level > 85) return "bg-destructive";
  if (level > 65) return "bg-warning";
  return "bg-success";
}

function getTrendAnalysis(current: number, history: any[], stationId: string): string {
  if (history.length < 2) return "Not enough historical data to analyze trends.";
  
  const recentData = [...history].slice(-7);
  if (recentData.length < 2) return "Not enough recent data to analyze trends.";
  
  const values = recentData
    .map(item => item[stationId])
    .filter(value => value !== undefined && value !== null);
  
  if (values.length < 2) return "Incomplete data for trend analysis.";
  
  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;
  
  if (diff > 10) {
    return `Water levels have been rising significantly (${diff}% increase) in the recent period. This could indicate increased inflow or potential blockage issues downstream.`;
  } else if (diff > 5) {
    return `Water levels show a moderate increasing trend (${diff}% increase). Monitor the situation regularly.`;
  } else if (diff < -10) {
    return `Water levels have been decreasing significantly (${Math.abs(diff)}% decrease). This could indicate reduced inflow or potentially successful drainage operations.`;
  } else if (diff < -5) {
    return `Water levels show a moderate decreasing trend (${Math.abs(diff)}% decrease). This suggests normal drainage operations are effective.`;
  } else {
    return `Water levels have been relatively stable (${Math.abs(diff)}% change). The system appears to be operating within normal parameters.`;
  }
}

function getRecommendations(current: number, average: number): React.ReactNode[] {
  const recommendations = [];
  
  if (current > 85) {
    recommendations.push(<li key="1">Immediately dispatch maintenance crew to inspect for blockages</li>);
    recommendations.push(<li key="2">Notify downstream stations of potential flooding risk</li>);
    recommendations.push(<li key="3">Increase monitoring frequency to hourly until levels normalize</li>);
  } else if (current > 65) {
    recommendations.push(<li key="1">Schedule inspection within the next 24 hours</li>);
    recommendations.push(<li key="2">Monitor for further increases in water level</li>);
  } else {
    recommendations.push(<li key="1">Maintain regular monitoring schedule</li>);
  }
  
  if (current > average + 15) {
    recommendations.push(<li key="4">Investigate potential causes for abnormal water level increase</li>);
  } else if (current < average - 15) {
    recommendations.push(<li key="5">Verify sensor calibration if consistently below average levels</li>);
  }
  
  return recommendations;
}