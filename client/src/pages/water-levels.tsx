import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Droplet, 
  BarChart2,
  ChevronRight
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
        const deviceList = Object.entries(data).map(([key, device]: [string, any]) => ({
          firebaseKey: key,
          id: device.id,
          name: device.name,
          location: device.location,
          status: device.status,
          lastSeen: device.lastSeen,
          ...device
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
                const waterLevel = waterLevels[d.firebaseKey];
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
      
      {/* Quick Access Navigation */}
      {devices.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
            <CardDescription>Access detailed analytics and device management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/device-history">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BarChart2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Device History</div>
                      <div className="text-sm text-muted-foreground">View detailed charts and trends</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
              </Link>
              
              <Link to="/waste-bins">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Droplet className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Waste Bins</div>
                      <div className="text-sm text-muted-foreground">Monitor bin status</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
              </Link>
              
              <Link to="/devices">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <BarChart2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Device Management</div>
                      <div className="text-sm text-muted-foreground">Add and configure devices</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
    </DashboardLayout>
  );
}