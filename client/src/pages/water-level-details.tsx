import { useEffect, useState, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, ArrowLeft, Droplet, BarChart3, AlertTriangle, Activity, CalendarClock } from "lucide-react";
import { WaterLevel } from "@/types";
import { Link, useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-primary/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
                  <div className="flex items-center">
                    <Droplet className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Current Level</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-3xl font-bold text-gray-800">{stats.current}%</div>
                    <Badge 
                      variant="outline" 
                      className={`${stats.current > 85 ? 'bg-red-50 text-red-600' : stats.current > 65 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
                    >
                      {getWaterLevelStatus(stats.current)}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.current}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-2 rounded-full ${getWaterLevelColor(stats.current)}`}
                      ></motion.div>
                    </div>
                    <div className="text-xs mt-1 text-gray-500 flex items-center">
                      <CalendarClock className="h-3 w-3 mr-1" />
                      Last updated: {stationData.lastUpdated}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-blue-400/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-blue-500 mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Average Level</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-gray-800">{stats.avg}%</div>
                  <div className="mt-3 h-12">
                    {getTrendData().length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getTrendData()} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={false}
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white/90 backdrop-blur-sm p-2 border border-gray-200 rounded-md shadow-sm">
                                    <p className="text-xs">{`${payload[0].value}%`}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-amber-500/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-transparent">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Maximum Level</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-gray-800">{stats.max}%</div>
                  <div className="mt-3 flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getWaterLevelColor(stats.max)} mr-2`}></div>
                    <div className="text-xs text-gray-600">
                      {stats.max > 85 ? 'Critical threshold exceeded' : 
                        stats.max > 65 ? 'Warning threshold exceeded' : 
                        'Within normal parameters'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              className="flex"
            >
              <Card className="w-full border-2 hover:border-green-500/70 hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-transparent">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
                    <CardTitle className="text-sm font-medium text-gray-700">Minimum Level</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold text-gray-800">{stats.min}%</div>
                  <div className="mt-3 flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getWaterLevelColor(stats.min)} mr-2`}></div>
                    <div className="text-xs text-gray-600">
                      {getWaterLevelStatus(stats.min)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Main chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-6"
          >
            <Card className="border-2 hover:border-blue-200 transition-all duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50/40 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 text-primary mr-2" />
                    <CardTitle>Water Level History</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Select 
                      value={timeRange} 
                      onValueChange={setTimeRange}
                    >
                      <SelectTrigger className="w-32 md:w-40 bg-white hover:bg-blue-50 transition-colors">
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
              <CardContent className="p-6">
                {filteredHistoryData.length > 0 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredHistoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          stroke="#888"
                          fontSize={12}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          stroke="#888" 
                          fontSize={12}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Water Level']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: '1px solid #e2e8f0'
                          }}
                        />
                        <Legend 
                          iconType="circle" 
                          iconSize={10}
                          wrapperStyle={{ paddingTop: 15 }}
                        />
                        <defs>
                          <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey={stationId} 
                          name={stationData.location || stationId} 
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorLevel)"
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] py-10">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                      <Info className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No History Data</h3>
                    <p className="text-gray-500 text-center max-w-md">
                      {loading ? "Loading data..." : "No historical data is available for this monitoring station yet."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Status and analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Card className="border-2 hover:border-blue-200 transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50/40 to-transparent">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-primary mr-2" />
                  <CardTitle>Station Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-start p-5 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100 shadow-sm"
                  >
                    <div className="mr-4 mt-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStatusBackground(stats.current)}`}>
                        <Info className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2 text-gray-800">Current Status</h3>
                      <p className="text-gray-600 leading-relaxed">
                        This monitoring device is currently reporting a water level of <strong>{stats.current}%</strong>, which is considered{' '}
                        <span className={getWaterLevelTextColor(stats.current)}><strong>{getWaterLevelStatus(stats.current).toLowerCase()}</strong></span>.
                        {stats.current > 75 && ' Immediate attention may be required to prevent potential flooding or drainage issues.'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        <Badge 
                          variant="outline" 
                          className="bg-blue-50 text-blue-600 font-normal mr-2 capitalize"
                        >
                          Multi-parameter sensor
                        </Badge>
                        Monitoring water level and flow rate at this location
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <h3 className="text-lg font-medium mb-3 text-gray-800 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                      Trend Analysis
                    </h3>
                    <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <p className="text-gray-700 leading-relaxed">
                        {getTrendAnalysis(stats.current, filteredHistoryData, stationId)}
                      </p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <h3 className="text-lg font-medium mb-3 text-gray-800 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      Recommendations
                    </h3>
                    <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <ul className="space-y-3">
                        {getRecommendations(stats.current, stats.avg).map((recommendation, index) => (
                          <motion.li 
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.9 + (index * 0.1) }}
                            className="flex items-start"
                          >
                            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mr-3 mt-0.5">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700">{recommendation.props.children}</div>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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