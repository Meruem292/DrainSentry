import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue, get } from "firebase/database";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { 
  Droplet, 
  Trash, 
  Scale, 
  ArrowLeft,
  CalendarDays,
  Clock,
  RefreshCw,
  AlertTriangle,
  Info
} from "lucide-react";
import { useLocation } from "wouter";

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
  const [location, setLocation] = useLocation();
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
  const [activeTab, setActiveTab] = useState("waterLevel");
  
  // Get device ID from URL path parameter
  const [, deviceId] = window.location.pathname.split("/device-history/");
  
  useEffect(() => {
    if (!user || !deviceId) return;

    // First, find the correct container key for the device ID
    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    // Get all devices to find the matching container
    const devicesUnsubscribe = onValue(devicesRef, (devicesSnapshot) => {
      if (!devicesSnapshot.exists()) {
        setLoading(false);
        toast({
          title: "Device not found",
          description: "Could not find the device information",
          variant: "destructive"
        });
        return;
      }

      // Find the device with the given ID
      let foundDevice: Device | null = null;
      let deviceContainerKey = null;

      devicesSnapshot.forEach((childSnapshot) => {
        const deviceContainer = childSnapshot.val();
        if (deviceContainer.id === deviceId) {
          foundDevice = deviceContainer;
          deviceContainerKey = childSnapshot.key;
          return true; // Break the forEach loop
        }
        return false;
      });

      if (!foundDevice || !deviceContainerKey) {
        setLoading(false);
        toast({
          title: "Device not found",
          description: "Could not find the device with the specified ID",
          variant: "destructive"
        });
        return;
      }

      setDevice(foundDevice);

      // Now load the water level and waste bin data
      const waterLevelRef = ref(database, `users/${user.uid}/waterLevels/${deviceContainerKey}`);
      const wasteBinRef = ref(database, `users/${user.uid}/wasteBins/${deviceContainerKey}`);
      
      // Get water level data
      const waterLevelUnsubscribe = onValue(waterLevelRef, (waterLevelSnapshot) => {
        if (waterLevelSnapshot.exists()) {
          setWaterLevel(waterLevelSnapshot.val());
        }
      });
      
      // Get waste bin data
      const wasteBinUnsubscribe = onValue(wasteBinRef, (wasteBinSnapshot) => {
        if (wasteBinSnapshot.exists()) {
          setWasteBin(wasteBinSnapshot.val());
        }
      });
      
      // Load history data based on the selected date and range
      loadHistoryData(user.uid, deviceContainerKey, selectedDate, historyRange);
      
      setLoading(false);
      
      return () => {
        waterLevelUnsubscribe();
        wasteBinUnsubscribe();
      };
    });
    
    return () => {
      devicesUnsubscribe();
    };
  }, [user, deviceId, selectedDate, historyRange]);
  
  const loadHistoryData = async (
    userId: string, 
    deviceContainerKey: string, 
    date: Date | undefined,
    range: "24h" | "7d" | "30d"
  ) => {
    if (!date) return;
    
    // Format the selected date
    const formattedDate = date.toISOString().split('T')[0];
    
    // Prepare empty history objects
    const newHistory: DeviceReadingHistory = {
      waterLevels: [],
      binFullness: [],
      binWeight: []
    };
    
    try {
      // Load water level history
      const waterLevelHistoryRef = ref(
        database, 
        `users/${userId}/waterLevelHistory/${formattedDate}/${deviceContainerKey}`
      );
      
      const waterLevelSnapshot = await get(waterLevelHistoryRef);
      
      if (waterLevelSnapshot.exists()) {
        const waterLevelData = waterLevelSnapshot.val();
        
        // Convert object to array of entries
        Object.entries(waterLevelData).forEach(([timestamp, data]) => {
          // Check if data has value property as per the JSON structure
          const levelValue = data && typeof data === 'object' && 'value' in data 
            ? (data as {value: number}).value
            : (typeof data === 'number' ? data : 0);
            
          newHistory.waterLevels.push({
            timestamp,
            value: levelValue,
            type: 'water'
          });
        });
      }
      
      // Load waste bin history (both fullness and weight in one place)
      const wasteBinHistoryRef = ref(
        database, 
        `users/${userId}/wasteBinHistory/${formattedDate}/${deviceContainerKey}`
      );
      
      const wasteBinSnapshot = await get(wasteBinHistoryRef);
      
      if (wasteBinSnapshot.exists()) {
        const wasteBinData = wasteBinSnapshot.val();
        
        // Convert object to array of entries
        Object.entries(wasteBinData).forEach(([timestamp, data]) => {
          // Extract fullness and weight from the data object
          if (data && typeof data === 'object') {
            const binData = data as {fullness?: number, weight?: number};
            
            // Add fullness entry if it exists
            if ('fullness' in binData && binData.fullness !== undefined) {
              newHistory.binFullness.push({
                timestamp,
                value: binData.fullness,
                type: 'fullness'
              });
            }
            
            // Add weight entry if it exists
            if ('weight' in binData && binData.weight !== undefined) {
              newHistory.binWeight.push({
                timestamp,
                value: binData.weight,
                type: 'weight'
              });
            }
          }
        });
      }
      
      // Sort all history entries by timestamp (most recent first)
      newHistory.waterLevels.sort((a, b) => 
        new Date(b.timestamp.replace(/_/g, ':')).getTime() - 
        new Date(a.timestamp.replace(/_/g, ':')).getTime()
      );
      
      newHistory.binFullness.sort((a, b) => 
        new Date(b.timestamp.replace(/_/g, ':')).getTime() - 
        new Date(a.timestamp.replace(/_/g, ':')).getTime()
      );
      
      newHistory.binWeight.sort((a, b) => 
        new Date(b.timestamp.replace(/_/g, ':')).getTime() - 
        new Date(a.timestamp.replace(/_/g, ':')).getTime()
      );
      
      setReadingHistory(newHistory);
      
    } catch (error) {
      console.error("Error loading history data:", error);
      toast({
        title: "Error",
        description: "Failed to load history data",
        variant: "destructive"
      });
    }
  };
  
  // Helper function to format the timestamp for display
  const formatTimestamp = (timestamp: string) => {
    // Convert from format HH_MM_SS to HH:MM:SS
    return timestamp.replace(/_/g, ':');
  };
  
  // Helper to add leading zeros to dates
  const formatDateForDisplay = (date: Date | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get current water level and waste bin stats
  const currentWaterLevel = waterLevel?.level || 0;
  const currentBinFullness = wasteBin?.fullness || 0;
  const currentBinWeight = wasteBin?.weight || 0;
  
  // Get status color classes based on values
  const getWaterLevelColor = (level: number) => {
    if (level < 30) return "text-green-500";
    if (level < 70) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getBinFullnessColor = (fullness: number) => {
    if (fullness < 30) return "text-green-500";
    if (fullness < 70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <DashboardLayout 
      title={device?.name || "Device History"} 
      subtitle={device?.location || "Loading..."}
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading device data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/devices")}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Devices
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (device && user) {
                    // Find the device container key again
                    const deviceContainerKey = device.id;
                    loadHistoryData(user.uid, deviceContainerKey, selectedDate, historyRange);
                    toast({
                      title: "Refreshed",
                      description: "Data has been refreshed",
                    });
                  }
                }}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3 mb-6">
            {/* Current Water Level */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-blue-500" />
                  Current Water Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getWaterLevelColor(currentWaterLevel)}`}>
                    {currentWaterLevel}%
                  </span>
                  <Badge variant={currentWaterLevel > 70 ? "destructive" : (currentWaterLevel > 30 ? "outline" : "default")}>
                    {currentWaterLevel > 70 ? "High" : (currentWaterLevel > 30 ? "Medium" : "Low")}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated).toLocaleString() : "Never"}
                </p>
              </CardContent>
            </Card>
            
            {/* Current Bin Fullness */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Trash className="h-5 w-5 text-orange-500" />
                  Current Bin Fullness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getBinFullnessColor(currentBinFullness)}`}>
                    {currentBinFullness}%
                  </span>
                  <Badge variant={currentBinFullness > 70 ? "destructive" : (currentBinFullness > 30 ? "outline" : "default")}>
                    {currentBinFullness > 70 ? "Full" : (currentBinFullness > 30 ? "Medium" : "Empty")}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied).toLocaleString() : "Never"}
                </p>
              </CardContent>
            </Card>
            
            {/* Current Bin Weight */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-500" />
                  Current Bin Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {currentBinWeight} kg
                  </span>
                  <Badge variant={currentBinWeight > 10 ? "destructive" : (currentBinWeight > 5 ? "outline" : "default")}>
                    {currentBinWeight > 10 ? "Heavy" : (currentBinWeight > 5 ? "Medium" : "Light")}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Last updated: {wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied).toLocaleString() : "Never"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Date Selection Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-gray-500" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="border rounded-md"
                    disabled={(date) => date > new Date() || date < new Date('2024-01-01')}
                  />
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Selected: {formatDateForDisplay(selectedDate)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant={historyRange === "24h" ? "default" : "outline"}
                        onClick={() => setHistoryRange("24h")}
                        size="sm"
                        className="flex-1"
                      >
                        24 Hours
                      </Button>
                      <Button 
                        variant={historyRange === "7d" ? "default" : "outline"}
                        onClick={() => setHistoryRange("7d")}
                        size="sm"
                        className="flex-1"
                      >
                        7 Days
                      </Button>
                      <Button 
                        variant={historyRange === "30d" ? "default" : "outline"}
                        onClick={() => setHistoryRange("30d")}
                        size="sm"
                        className="flex-1"
                      >
                        30 Days
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Readings History Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  Sensor Readings History
                </CardTitle>
                <CardDescription>
                  Historical data for {formatDateForDisplay(selectedDate)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="waterLevel" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="mb-4 grid grid-cols-3 w-full">
                    <TabsTrigger value="waterLevel" className="flex items-center gap-1">
                      <Droplet className="h-4 w-4" />
                      <span className="hidden sm:inline">Water Level</span>
                      <span className="sm:hidden">Water</span>
                    </TabsTrigger>
                    <TabsTrigger value="binFullness" className="flex items-center gap-1">
                      <Trash className="h-4 w-4" />
                      <span className="hidden sm:inline">Bin Fullness</span>
                      <span className="sm:hidden">Fullness</span>
                    </TabsTrigger>
                    <TabsTrigger value="binWeight" className="flex items-center gap-1">
                      <Scale className="h-4 w-4" />
                      <span className="hidden sm:inline">Bin Weight</span>
                      <span className="sm:hidden">Weight</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="waterLevel">
                    {readingHistory.waterLevels.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Level (%)</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {readingHistory.waterLevels.map((entry, index) => (
                              <TableRow key={`water-${index}`} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{formatTimestamp(entry.timestamp)}</TableCell>
                                <TableCell className={getWaterLevelColor(entry.value)}>{entry.value}%</TableCell>
                                <TableCell>
                                  <Badge variant={entry.value > 70 ? "destructive" : (entry.value > 30 ? "outline" : "default")}>
                                    {entry.value > 70 ? "High" : (entry.value > 30 ? "Medium" : "Low")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-gray-500">No water level readings available for the selected date.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="binFullness">
                    {readingHistory.binFullness.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Fullness (%)</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {readingHistory.binFullness.map((entry, index) => (
                              <TableRow key={`fullness-${index}`} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{formatTimestamp(entry.timestamp)}</TableCell>
                                <TableCell className={getBinFullnessColor(entry.value)}>{entry.value}%</TableCell>
                                <TableCell>
                                  <Badge variant={entry.value > 70 ? "destructive" : (entry.value > 30 ? "outline" : "default")}>
                                    {entry.value > 70 ? "Full" : (entry.value > 30 ? "Medium" : "Empty")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-gray-500">No bin fullness readings available for the selected date.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="binWeight">
                    {readingHistory.binWeight.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Weight (kg)</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {readingHistory.binWeight.map((entry, index) => (
                              <TableRow key={`weight-${index}`} className="hover:bg-gray-50">
                                <TableCell className="font-medium">{formatTimestamp(entry.timestamp)}</TableCell>
                                <TableCell>{entry.value} kg</TableCell>
                                <TableCell>
                                  <Badge variant={entry.value > 10 ? "destructive" : (entry.value > 5 ? "outline" : "default")}>
                                    {entry.value > 10 ? "Heavy" : (entry.value > 5 ? "Medium" : "Light")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-gray-500">No bin weight readings available for the selected date.</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {readingHistory.waterLevels.length === 0 && 
                   readingHistory.binFullness.length === 0 && 
                   readingHistory.binWeight.length === 0 && (
                    <div className="border rounded-lg p-6 bg-gray-50 mt-4">
                      <div className="flex flex-col items-center text-center">
                        <Info className="h-10 w-10 text-blue-500 mb-2" />
                        <h3 className="text-lg font-semibold mb-1">No Data Available</h3>
                        <p className="text-gray-600 mb-4">There are no sensor readings available for this device on the selected date.</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedDate(new Date())}
                        >
                          Try Today's Date
                        </Button>
                      </div>
                    </div>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}