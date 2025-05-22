import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue, get } from "firebase/database";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WaterLevel, WasteBin, Device } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";

// Define the history entry interfaces
interface HistoryEntry {
  timestamp: string;
  value: number;
  type: string;
}

interface DeviceReadingHistory {
  waterLevels: HistoryEntry[];
  binFullness: HistoryEntry[];
  binWeight: HistoryEntry[];
}

export default function DeviceHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<Device | null>(null);
  const [waterLevel, setWaterLevel] = useState<WaterLevel | null>(null);
  const [wasteBin, setWasteBin] = useState<WasteBin | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [readingHistory, setReadingHistory] = useState<DeviceReadingHistory>({
    waterLevels: [],
    binFullness: [],
    binWeight: []
  });
  const [historyRange, setHistoryRange] = useState<"24h" | "7d" | "30d">("7d");
  
  // Get device ID from URL path parameter
  const [, deviceId] = window.location.pathname.split("/device-history/");
  
  useEffect(() => {
    if (!user || !deviceId) return;

    // First, find the correct container key for the device ID
    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    // Get all devices to find the matching container
    const devicesUnsubscribe = onValue(devicesRef, (devicesSnapshot) => {
      if (!devicesSnapshot.exists()) {
        setDevice(null);
        toast({
          title: "Device not found",
          description: "No devices found in your account.",
          variant: "destructive",
        });
        return;
      }
      
      // Find the container key for this device ID
      const devicesData = devicesSnapshot.val();
      let containerKey = null;
      let deviceData = null;
      
      // Loop through devices to find the one with matching ID
      Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
        // Check if this device has the ID we're looking for
        if (value.id === deviceId) {
          containerKey = key;
          deviceData = value;
        }
      });
      
      if (!containerKey || !deviceData) {
        setDevice(null);
        toast({
          title: "Device not found",
          description: "The requested device could not be found in your account.",
          variant: "destructive",
        });
        return;
      }
      
      // Set the device data
      setDevice({
        id: deviceId,
        ...deviceData
      });
      
      // Now get the water level data using the container key
      const waterLevelRef = ref(database, `users/${user.uid}/waterLevels/${containerKey}`);
      onValue(waterLevelRef, (snapshot) => {
        if (snapshot.exists()) {
          setWaterLevel(snapshot.val());
        } else {
          setWaterLevel(null);
        }
      });
      
      // Get waste bin data using the container key
      const wasteBinRef = ref(database, `users/${user.uid}/wasteBins/${containerKey}`);
      onValue(wasteBinRef, (snapshot) => {
        if (snapshot.exists()) {
          setWasteBin(snapshot.val());
        } else {
          setWasteBin(null);
        }
      });
      
      // Fetch real history data from Firebase
      fetchHistoryData(containerKey, historyRange);
      
      setLoading(false);
    });
    
    return () => {
      devicesUnsubscribe();
    };
  }, [user, deviceId, historyRange]);

  // Generate sample history data based on the selected range
  const generateHistoryData = (range: "24h" | "7d" | "30d") => {
    const waterLevels: HistoryEntry[] = [];
    const binFullness: HistoryEntry[] = [];
    const binWeight: HistoryEntry[] = [];
    
    const now = new Date();
    let points = 0;
    let intervalHours = 0;
    
    // Set the appropriate number of data points and interval based on range
    switch (range) {
      case "24h":
        points = 24;
        intervalHours = 1;
        break;
      case "7d":
        points = 28; // 4 readings per day for 7 days
        intervalHours = 6;
        break;
      case "30d":
        points = 30; // 1 reading per day for 30 days
        intervalHours = 24;
        break;
    }
    
    // Generate the historical data points
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() - (i * intervalHours));
      
      // Create fluctuating but somewhat consistent data patterns
      const hourOfDay = timestamp.getHours();
      const dayModifier = Math.sin(timestamp.getDate() / 5) * 10; // Fluctuation based on day
      
      // Water levels tend to be higher in the morning and evening
      const timeModifier = Math.sin((hourOfDay / 24) * Math.PI * 2) * 15;
      const waterLevelBase = 50 + dayModifier; // Baseline around 50%
      const waterLevelValue = Math.min(100, Math.max(0, waterLevelBase + timeModifier + (Math.random() * 10 - 5)));
      
      // Bin fullness increases throughout the day
      const fullnessBase = 30 + (hourOfDay / 24) * 30 + dayModifier; // Starts lower, increases during day
      const fullnessValue = Math.min(100, Math.max(0, fullnessBase + (Math.random() * 15 - 5)));
      
      // Bin weight correlates somewhat with fullness
      const weightValue = Math.min(100, Math.max(0, (fullnessValue * 0.8) + (Math.random() * 20 - 10)));
      
      waterLevels.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(waterLevelValue),
        type: getStatusType(waterLevelValue)
      });
      
      binFullness.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(fullnessValue),
        type: getStatusType(fullnessValue)
      });
      
      binWeight.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(weightValue),
        type: getStatusType(weightValue)
      });
    }
    
    setReadingHistory({
      waterLevels,
      binFullness,
      binWeight
    });
  };
  
  // Helper function to determine status type based on value
  const getStatusType = (value: number): string => {
    if (value > 85) return "critical";
    if (value > 65) return "warning";
    return "normal";
  };
  
  // Format date for table display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  // Get CSS class for status badge
  const getStatusBadgeClass = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "warning":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-success text-success-foreground";
    }
  };
  
  // Get the number of rows to display based on range
  const getDisplayedRows = () => {
    // For demonstration, we'll show a subset of the data
    switch (historyRange) {
      case "24h":
        return 24; // Show all hourly data
      case "7d":
        return 28; // Show all 4x daily data
      case "30d":
        return 15; // Show half the monthly data to keep table reasonable
      default:
        return 10;
    }
  };

  // Helper function to find critical events
  const findCriticalEvents = () => {
    const allEntries = [
      ...readingHistory.waterLevels.map(e => ({ ...e, category: 'Water Level' })),
      ...readingHistory.binFullness.map(e => ({ ...e, category: 'Bin Fullness' })),
      ...readingHistory.binWeight.map(e => ({ ...e, category: 'Bin Weight' }))
    ];
    
    return allEntries.filter(entry => entry.type === 'critical')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5); // Just show the 5 most recent critical events
  };

  if (loading) {
    return (
      <DashboardLayout title="Device History" subtitle="Loading history data...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!device) {
    return (
      <DashboardLayout title="Device History" subtitle="Device not found">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h3 className="text-xl font-medium mb-4">Device not found</h3>
          <p className="text-gray-500 mb-4">We couldn't find the device you're looking for.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={`${device.name} History`}
      subtitle={`Historical sensor readings and statistics for ${device.location}`}
    >
      {/* Time Range Selection */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium mb-2">History Range</h3>
          <div className="flex space-x-2">
            <Button 
              variant={historyRange === "24h" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setHistoryRange("24h")}
            >
              Last 24 Hours
            </Button>
            <Button 
              variant={historyRange === "7d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setHistoryRange("7d")}
            >
              Last 7 Days
            </Button>
            <Button 
              variant={historyRange === "30d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setHistoryRange("30d")}
            >
              Last 30 Days
            </Button>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500">Device ID: {deviceId}</p>
          <p className="text-sm text-gray-500">Status: 
            <Badge className="ml-2" variant={device.status === "active" ? "default" : "destructive"}>
              {device.status}
            </Badge>
          </p>
        </div>
      </div>

      {/* Data Tabs */}
      <Tabs defaultValue="readings" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="readings">Sensor Readings</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="alerts">Critical Events</TabsTrigger>
        </TabsList>
        
        {/* Readings Tab */}
        <TabsContent value="readings">
          <Card>
            <CardHeader>
              <CardTitle>Historical Sensor Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Water Level (%)</TableHead>
                    <TableHead>Bin Fullness (%)</TableHead>
                    <TableHead>Bin Weight (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readingHistory.waterLevels.slice(0, getDisplayedRows()).map((entry, index) => (
                    <TableRow key={`reading-${index}`}>
                      <TableCell className="font-medium">{formatDate(entry.timestamp)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(readingHistory.waterLevels[index].type)}>
                          {readingHistory.waterLevels[index].value}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(readingHistory.binFullness[index].type)}>
                          {readingHistory.binFullness[index].value}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(readingHistory.binWeight[index].type)}>
                          {readingHistory.binWeight[index].value}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {readingHistory.waterLevels.length > getDisplayedRows() && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing the most recent {getDisplayedRows()} readings out of {readingHistory.waterLevels.length} total.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Water Level Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Average Level</p>
                    <p className="text-2xl font-semibold">
                      {Math.round(readingHistory.waterLevels.reduce((sum, entry) => sum + entry.value, 0) / readingHistory.waterLevels.length)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Maximum Level</p>
                    <p className="text-2xl font-semibold">
                      {Math.max(...readingHistory.waterLevels.map(entry => entry.value))}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Critical Events</p>
                    <p className="text-2xl font-semibold">
                      {readingHistory.waterLevels.filter(entry => entry.type === 'critical').length}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Warning Events</p>
                    <p className="text-2xl font-semibold">
                      {readingHistory.waterLevels.filter(entry => entry.type === 'warning').length}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Insights</h4>
                  <p className="text-gray-600 text-sm">
                    Water levels show a distinct pattern with higher readings 
                    {readingHistory.waterLevels.some(e => e.value > 80) 
                      ? " reaching critical levels multiple times" 
                      : " staying mostly within safe ranges"} during the selected period.
                    {readingHistory.waterLevels[0].value > readingHistory.waterLevels[readingHistory.waterLevels.length - 1].value
                      ? " The overall trend shows a reduction in water levels."
                      : " The overall trend shows an increase in water levels."}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Waste Bin Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Average Fullness</p>
                    <p className="text-2xl font-semibold">
                      {Math.round(readingHistory.binFullness.reduce((sum, entry) => sum + entry.value, 0) / readingHistory.binFullness.length)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Maximum Fullness</p>
                    <p className="text-2xl font-semibold">
                      {Math.max(...readingHistory.binFullness.map(entry => entry.value))}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Average Weight</p>
                    <p className="text-2xl font-semibold">
                      {Math.round(readingHistory.binWeight.reduce((sum, entry) => sum + entry.value, 0) / readingHistory.binWeight.length)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Maximum Weight</p>
                    <p className="text-2xl font-semibold">
                      {Math.max(...readingHistory.binWeight.map(entry => entry.value))}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Insights</h4>
                  <p className="text-gray-600 text-sm">
                    The waste bin data indicates a
                    {readingHistory.binFullness[0].value > readingHistory.binFullness[readingHistory.binFullness.length - 1].value
                      ? " decreasing trend in fullness levels"
                      : " increasing trend in fullness levels"}, with
                    {readingHistory.binFullness.filter(e => e.type === 'critical').length > 0
                      ? ` ${readingHistory.binFullness.filter(e => e.type === 'critical').length} critical fullness alerts`
                      : " no critical fullness alerts"} during this period.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Critical Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  The following events exceeded critical thresholds during the selected time period:
                </p>
                
                <ul className="space-y-3">
                  {findCriticalEvents().length > 0 ? (
                    findCriticalEvents().map((event: any, index) => (
                      <li key={`event-${index}`} className="border p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-medium">{event.category}</span>
                          <span className="ml-2 text-sm text-gray-500">{formatDate(event.timestamp)}</span>
                        </div>
                        <Badge variant="destructive">{event.value}%</Badge>
                      </li>
                    ))
                  ) : (
                    <li className="text-center p-6 text-gray-500">
                      No critical events recorded during this period
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}