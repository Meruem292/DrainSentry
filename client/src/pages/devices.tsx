import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Pencil, 
  Droplet, 
  Trash, 
  Scale, 
  CheckCircle2, 
  XCircle,
  CalendarClock,
  MapPin,
  Gauge,
  ChevronRight
} from "lucide-react";
import { Device, WaterLevel, WasteBin } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Devices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [waterLevels, setWaterLevels] = useState<Record<string, WaterLevel>>({});
  const [wasteBins, setWasteBins] = useState<Record<string, WasteBin>>({});
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  
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

  const handleAddDevice = async () => {
    if (!user) return;
    
    if (!deviceId.trim()) {
      toast({
        title: "Device ID is required",
        description: "Please enter a device ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const newDevice = {
        name: deviceName.trim() || deviceId.trim(),
        location: deviceLocation.trim() || "Unknown",
        status: "inactive",
        lastSeen: new Date().toISOString(),
      };
      
      const devicesRef = ref(database, `users/${user.uid}/devices`);
      const newDeviceRef = push(devicesRef);
      await set(newDeviceRef, newDevice);
      
      // Create entries for all sensor types for the device
      // Water level sensor data
      const waterRef = ref(database, `users/${user.uid}/waterLevels/${newDeviceRef.key}`);
      await set(waterRef, {
        id: deviceId,
        location: deviceLocation.trim() || "Unknown",
        level: 0,
        lastUpdated: "Never",
      });
      
      // Waste bin sensor data
      const wasteRef = ref(database, `users/${user.uid}/wasteBins/${newDeviceRef.key}`);
      await set(wasteRef, {
        id: deviceId,
        location: deviceLocation.trim() || "Unknown",
        fullness: 0,
        weight: 0,
        lastEmptied: "Never",
      });
      
      toast({
        title: "Device Added",
        description: "Your device has been added successfully",
      });
      
      // Reset form
      setDeviceId("");
      setDeviceName("");
      setDeviceLocation("");
    } catch (error) {
      toast({
        title: "Error Adding Device",
        description: "There was an error adding your device. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return;
    
    try {
      // Remove device from devices
      const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
      await remove(deviceRef);
      
      // Check if there's associated water level data
      const waterRef = ref(database, `users/${user.uid}/waterLevels/${deviceId}`);
      const waterSnapshot = await get(waterRef);
      if (waterSnapshot.exists()) {
        await remove(waterRef);
      }
      
      // Check if there's associated waste bin data
      const wasteRef = ref(database, `users/${user.uid}/wasteBins/${deviceId}`);
      const wasteSnapshot = await get(wasteRef);
      if (wasteSnapshot.exists()) {
        await remove(wasteRef);
      }
      
      toast({
        title: "Device Removed",
        description: "Your device has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error Removing Device",
        description: "There was an error removing your device. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to get water level status color
  const getWaterLevelColor = (level: number): string => {
    if (level > 85) return "bg-destructive";
    if (level > 65) return "bg-warning";
    return "bg-success";
  };

  // Helper function to get bin fullness color
  const getBinFullnessColor = (fullness: number): string => {
    if (fullness > 85) return "bg-destructive";
    if (fullness > 60) return "bg-warning";
    return "bg-success";
  };

  return (
    <DashboardLayout 
      title="Devices" 
      subtitle="Manage your connected DrainSentry devices"
    >
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800">Connected Devices</h2>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Add New Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Enter the device details to connect it to your DrainSentry system.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input 
                  id="deviceId" 
                  value={deviceId} 
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Enter device ID (required)"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="deviceName">Device Name (Optional)</Label>
                <Input 
                  id="deviceName" 
                  value={deviceName} 
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Enter a friendly name for this device"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="deviceLocation">Location</Label>
                <Input 
                  id="deviceLocation" 
                  value={deviceLocation} 
                  onChange={(e) => setDeviceLocation(e.target.value)}
                  placeholder="Enter the device location"
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleAddDevice}>Add Device</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {devices.length === 0 && !loading ? (
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No devices found</h3>
          <p className="text-gray-500 text-center mb-6">There are no devices connected to your account.</p>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Enter the device details to connect it to your DrainSentry system.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="deviceId">Device ID</Label>
                  <Input 
                    id="deviceId" 
                    value={deviceId} 
                    onChange={(e) => setDeviceId(e.target.value)}
                    placeholder="Enter device ID (required)"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="deviceName">Device Name (Optional)</Label>
                  <Input 
                    id="deviceName" 
                    value={deviceName} 
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Enter a friendly name for this device"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="deviceLocation">Location</Label>
                  <Input 
                    id="deviceLocation" 
                    value={deviceLocation} 
                    onChange={(e) => setDeviceLocation(e.target.value)}
                    placeholder="Enter the device location"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleAddDevice}>Add Device</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device, index) => {
            // Get associated sensor data for this device
            const waterLevel = waterLevels[device.id];
            const wasteBin = wasteBins[device.id];
            
            // Check if device is active (updated in the last 5 minutes)
            const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
            const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
            const fiveMinutesAgo = new Date();
            fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
            
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
              >
                <Card className="h-full border-2 hover:border-primary hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent">
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
                  
                  <CardContent className="pt-2">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-500">Water Level</span>
                        <span className="text-sm font-medium">{waterLevel?.level || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full ${getWaterLevelColor(waterLevel?.level || 0)}`} 
                          style={{ width: `${waterLevel?.level || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Bin Fullness</span>
                          <span className="text-sm font-medium">{wasteBin?.fullness || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full ${getBinFullnessColor(wasteBin?.fullness || 0)}`} 
                            style={{ width: `${wasteBin?.fullness || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-500">Weight</span>
                          <span className="text-sm font-medium">{wasteBin?.weight || 0} kg</span>
                        </div>
                        <div className="flex items-center">
                          <Scale className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-xs text-gray-500">Capacity: 100kg</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-0">
                    <div className="flex items-center text-xs text-gray-500">
                      <CalendarClock className="h-3.5 w-3.5 mr-1" />
                      Last seen: {device.lastSeen}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Device</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove {device.name}? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button 
                                variant="destructive" 
                                onClick={() => handleRemoveDevice(device.id)}
                              >
                                Remove
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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