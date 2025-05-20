import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, Plus, Trash2, Pencil } from "lucide-react";
import { Device } from "@/types";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Devices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("water_level");
  const [deviceLocation, setDeviceLocation] = useState("");
  
  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    const unsubscribe = onValue(devicesRef, (snapshot) => {
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

    return () => unsubscribe();
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
        type: deviceType,
        location: deviceLocation.trim() || "Unknown",
        status: "inactive",
        lastSeen: new Date().toISOString(),
      };
      
      const devicesRef = ref(database, `users/${user.uid}/devices`);
      const newDeviceRef = push(devicesRef);
      await set(newDeviceRef, newDevice);
      
      // Create initial entry based on device type
      if (deviceType === "water_level") {
        const waterRef = ref(database, `users/${user.uid}/waterLevels/${newDeviceRef.key}`);
        await set(waterRef, {
          id: deviceId,
          location: deviceLocation.trim() || "Unknown",
          level: 0,
          lastUpdated: "Never",
        });
      } else if (deviceType === "waste_bin") {
        const wasteRef = ref(database, `users/${user.uid}/wasteBins/${newDeviceRef.key}`);
        await set(wasteRef, {
          id: deviceId,
          location: deviceLocation.trim() || "Unknown",
          fullness: 0,
          weight: 0,
          lastEmptied: "Never",
        });
      }
      
      toast({
        title: "Device added",
        description: "The device has been added successfully",
      });
      
      // Reset form
      setDeviceId("");
      setDeviceName("");
      setDeviceLocation("");
      
    } catch (error) {
      console.error("Error adding device:", error);
      toast({
        title: "Failed to add device",
        description: "There was an error adding the device. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return;
    
    try {
      const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
      await remove(deviceRef);
      
      toast({
        title: "Device removed",
        description: "The device has been removed successfully",
      });
    } catch (error) {
      console.error("Error removing device:", error);
      toast({
        title: "Failed to remove device",
        description: "There was an error removing the device. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout 
      title="Devices" 
      subtitle="Manage your connected monitoring devices"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-800">Connected Devices</h2>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-5 w-5 mr-2" />
              Add Device
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
                <Label htmlFor="deviceType">Device Type</Label>
                <Select 
                  value={deviceType} 
                  onValueChange={setDeviceType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="water_level">Water Level Sensor</SelectItem>
                    <SelectItem value="waste_bin">Waste Bin Monitor</SelectItem>
                  </SelectContent>
                </Select>
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
      
      <Card>
        <CardContent className="p-6">
          {devices.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-8">
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
                      <Label htmlFor="deviceType">Device Type</Label>
                      <Select 
                        value={deviceType} 
                        onValueChange={setDeviceType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select device type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="water_level">Water Level Sensor</SelectItem>
                          <SelectItem value="waste_bin">Waste Bin Monitor</SelectItem>
                        </SelectContent>
                      </Select>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Device ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Seen</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id} className="border-b border-gray-200">
                      <td className="py-3 px-4">{device.id}</td>
                      <td className="py-3 px-4">{device.name}</td>
                      <td className="py-3 px-4">
                        {device.type === "water_level" ? "Water Level Sensor" : "Waste Bin Monitor"}
                      </td>
                      <td className="py-3 px-4">{device.location}</td>
                      <td className="py-3 px-4">
                        <span className={`status-badge ${
                          device.status === "active" 
                            ? "status-badge-success" 
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {device.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4">{device.lastSeen}</td>
                      <td className="py-3 px-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Remove Device</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to remove this device? This action cannot be undone.
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
