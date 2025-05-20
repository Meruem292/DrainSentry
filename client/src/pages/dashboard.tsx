import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WaterLevel, WasteBin } from "@/types";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const [waterData, setWaterData] = useState<WaterLevel[]>([]);
  const [wasteData, setWasteData] = useState<WasteBin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const waterRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteRef = ref(database, `users/${user.uid}/wasteBins`);

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
      setLoading(false);
    });

    return () => {
      waterUnsubscribe();
      wasteUnsubscribe();
    };
  }, [user]);

  // Calculate waste bin statistics
  const totalBins = wasteData.length;
  const totalWeight = wasteData.reduce((sum, bin) => sum + (bin.weight || 0), 0);
  const averageFullness = wasteData.length 
    ? Math.round(wasteData.reduce((sum, bin) => sum + (bin.fullness || 0), 0) / wasteData.length) 
    : 0;

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Monitor real-time sewer and waste management data"
    >
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="water">Water Levels</TabsTrigger>
          <TabsTrigger value="waste">Waste Bins</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Water Monitoring Stations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{waterData.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Waste Bins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBins}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Waste Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalWeight}kg</div>
              </CardContent>
            </Card>
          </div>
          
          {waterData.length === 0 && wasteData.length === 0 && !loading && (
            <Alert className="mt-4">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                No monitoring data available. Add devices on the Devices page to start monitoring.
              </AlertDescription>
            </Alert>
          )}
          
          {wasteData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Critical Waste Bins</CardTitle>
              </CardHeader>
              <CardContent>
                {wasteData
                  .filter(bin => bin.fullness > 75)
                  .map(bin => (
                    <div key={bin.id} className="mb-4 last:mb-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{bin.location} ({bin.id})</span>
                        <span className="text-sm font-medium">{bin.fullness}%</span>
                      </div>
                      <Progress 
                        value={bin.fullness} 
                        max={100} 
                        className="h-2"
                        indicatorClassName={bin.fullness > 85 ? "bg-destructive" : "bg-warning"}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">Last emptied: {bin.lastEmptied}</span>
                        <span className="text-xs font-medium">
                          {bin.fullness > 85 ? (
                            <span className="text-destructive">Critical</span>
                          ) : (
                            <span className="text-warning">Attention needed</span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                
                {wasteData.filter(bin => bin.fullness > 75).length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No critical waste bins at the moment
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="water" className="space-y-4">
          {waterData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <InfoIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Monitoring Stations</h3>
              <p className="text-gray-500 text-center mb-6">There are currently no water level monitoring stations available.</p>
              <Link href="/devices">
                <Button>
                  Add New Station
                </Button>
              </Link>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Water Level Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                {waterData.map(station => (
                  <div key={station.id} className="mb-4 last:mb-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{station.location} ({station.id})</span>
                      <span className="text-sm font-medium">{station.level}%</span>
                    </div>
                    <Progress 
                      value={station.level} 
                      max={100} 
                      className="h-2"
                      indicatorClassName={getWaterLevelColor(station.level)}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">Last updated: {station.lastUpdated}</span>
                      <span className="text-xs font-medium">
                        {getWaterLevelStatus(station.level)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="waste" className="space-y-4">
          {wasteData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <InfoIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Waste Bins</h3>
              <p className="text-gray-500 text-center mb-6">There are currently no waste bins available for monitoring.</p>
              <Link href="/devices">
                <Button>
                  Add Waste Bin
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Bins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalBins}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Average Fullness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{averageFullness}%</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Waste Collected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalWeight}kg</div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Waste Bins Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Bin ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Location</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fullness</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Weight</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Emptied</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wasteData.map(bin => (
                          <tr key={bin.id} className="border-b border-gray-200">
                            <td className="py-3 px-4">{bin.id}</td>
                            <td className="py-3 px-4">{bin.location}</td>
                            <td className="py-3 px-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${getBinFullnessColor(bin.fullness)}`} 
                                  style={{ width: `${bin.fullness}%` }}
                                ></div>
                              </div>
                              <div className="text-xs mt-1">{bin.fullness}%</div>
                            </td>
                            <td className="py-3 px-4">{bin.weight}kg</td>
                            <td className="py-3 px-4">{bin.lastEmptied}</td>
                            <td className="py-3 px-4">
                              <span className={`status-badge ${getBinStatusClass(bin.fullness)}`}>
                                {getBinStatus(bin.fullness)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function getWaterLevelColor(level: number): string {
  if (level > 85) return "bg-destructive";
  if (level > 65) return "bg-warning";
  return "bg-success";
}

function getWaterLevelStatus(level: number): React.ReactNode {
  if (level > 85) return <span className="text-destructive">Critical</span>;
  if (level > 65) return <span className="text-warning">Warning</span>;
  return <span className="text-success">Normal</span>;
}

function getBinFullnessColor(fullness: number): string {
  if (fullness > 85) return "bg-destructive";
  if (fullness > 65) return "bg-warning";
  return "bg-success";
}

function getBinStatus(fullness: number): string {
  if (fullness > 85) return "Critical";
  if (fullness > 65) return "Needs Attention";
  return "Good";
}

function getBinStatusClass(fullness: number): string {
  if (fullness > 85) return "status-badge-danger";
  if (fullness > 65) return "status-badge-warning";
  return "status-badge-success";
}
