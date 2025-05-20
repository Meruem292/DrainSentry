import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider"; 
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Clock,
  Eye
} from "lucide-react";
import { Device, WaterLevel, WasteBin } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function Devices() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [waterLevels, setWaterLevels] = useState<Record<string, WaterLevel>>({});
  const [wasteBins, setWasteBins] = useState<Record<string, WasteBin>>({});
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Threshold settings
  const [waterLevelThreshold, setWaterLevelThreshold] = useState(80);
  const [binFullnessThreshold, setBinFullnessThreshold] = useState(80);
  const [wasteWeightThreshold, setWasteWeightThreshold] = useState(80);
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyOnWaterLevel, setNotifyOnWaterLevel] = useState(true);
  const [notifyOnBinFullness, setNotifyOnBinFullness] = useState(true);
  const [notifyOnWeight, setNotifyOnWeight] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    const waterLevelsRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteBinsRef = ref(database, `users/${user.uid}/wasteBins`);
    const contactsRef = ref(database, `users/${user.uid}/contacts`);
    
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

    // Get all contacts
    const contactsUnsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const contactsList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value as any
        }));
        setContacts(contactsList);
      } else {
        setContacts([]);
      }
    });

    return () => {
      devicesUnsubscribe();
      waterLevelsUnsubscribe();
      wasteBinsUnsubscribe();
      contactsUnsubscribe();
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
        thresholds: {
          waterLevel: waterLevelThreshold,
          binFullness: binFullnessThreshold,
          wasteWeight: wasteWeightThreshold
        },
        notifications: {
          enabled: notificationsEnabled,
          notifyOnWaterLevel,
          notifyOnBinFullness,
          notifyOnWeight,
          notifyContacts: selectedContacts
        }
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
      resetForm();
    } catch (error) {
      toast({
        title: "Error Adding Device",
        description: "There was an error adding your device. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditDevice = async (device: Device) => {
    if (!user) return;
    
    setSelectedDevice(device);
    setDeviceName(device.name);
    setDeviceLocation(device.location);
    
    // Set threshold values
    setWaterLevelThreshold(device.thresholds?.waterLevel || 80);
    setBinFullnessThreshold(device.thresholds?.binFullness || 80);
    setWasteWeightThreshold(device.thresholds?.wasteWeight || 80);
    
    // Set notification values
    setNotificationsEnabled(device.notifications?.enabled || true);
    setNotifyOnWaterLevel(device.notifications?.notifyOnWaterLevel || true);
    setNotifyOnBinFullness(device.notifications?.notifyOnBinFullness || true);
    setNotifyOnWeight(device.notifications?.notifyOnWeight || true);
    setSelectedContacts(device.notifications?.notifyContacts || []);
    
    setEditMode(true);
  };
  
  const handleUpdateDevice = async () => {
    if (!user || !selectedDevice) return;
    
    try {
      const updatedDevice = {
        ...selectedDevice,
        name: deviceName.trim() || selectedDevice.name,
        location: deviceLocation.trim() || selectedDevice.location,
        thresholds: {
          waterLevel: waterLevelThreshold,
          binFullness: binFullnessThreshold,
          wasteWeight: wasteWeightThreshold
        },
        notifications: {
          enabled: notificationsEnabled,
          notifyOnWaterLevel,
          notifyOnBinFullness,
          notifyOnWeight,
          notifyContacts: selectedContacts
        }
      };
      
      const deviceRef = ref(database, `users/${user.uid}/devices/${selectedDevice.id}`);
      await set(deviceRef, updatedDevice);
      
      // Update associated water level location
      if (deviceLocation !== selectedDevice.location) {
        const waterRef = ref(database, `users/${user.uid}/waterLevels/${selectedDevice.id}`);
        const waterSnapshot = await get(waterRef);
        if (waterSnapshot.exists()) {
          const waterData = waterSnapshot.val();
          await set(waterRef, {
            ...waterData,
            location: deviceLocation.trim() || selectedDevice.location
          });
        }
        
        // Update associated waste bin location
        const wasteRef = ref(database, `users/${user.uid}/wasteBins/${selectedDevice.id}`);
        const wasteSnapshot = await get(wasteRef);
        if (wasteSnapshot.exists()) {
          const wasteData = wasteSnapshot.val();
          await set(wasteRef, {
            ...wasteData,
            location: deviceLocation.trim() || selectedDevice.location
          });
        }
      }
      
      toast({
        title: "Device Updated",
        description: "Your device has been updated successfully",
      });
      
      // Reset form and close dialog
      resetForm();
    } catch (error) {
      toast({
        title: "Error Updating Device",
        description: "There was an error updating your device. Please try again.",
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

  // Helper function to reset form fields
  const resetForm = () => {
    setDeviceId("");
    setDeviceName("");
    setDeviceLocation("");
    setSelectedDevice(null);
    setEditMode(false);
    setWaterLevelThreshold(80);
    setBinFullnessThreshold(80);
    setWasteWeightThreshold(80);
    setNotificationsEnabled(true);
    setNotifyOnWaterLevel(true);
    setNotifyOnBinFullness(true);
    setNotifyOnWeight(true);
    setSelectedContacts([]);
  };

  // Helper function to get water level status color
  const getWaterLevelColor = (level: number): string => {
    if (level > 85) return "text-destructive";
    if (level > 65) return "text-warning";
    return "text-success";
  };

  // Helper function to get bin fullness color
  const getBinFullnessColor = (fullness: number): string => {
    if (fullness > 85) return "text-destructive";
    if (fullness > 60) return "text-warning";
    return "text-success";
  };
  
  // Helper function to get bin weight color
  const getBinWeightColor = (weight: number): string => {
    if (weight > 85) return "text-destructive";
    if (weight > 60) return "text-warning";
    return "text-success";
  };
  
  // Calculate active status based on recent data updates (last 5 minutes)
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

  return (
    <DashboardLayout 
      title="Devices" 
      subtitle="Manage your connected DrainSentry devices"
    >
      {/* Edit Device Settings Dialog */}
      {editMode && selectedDevice && (
        <Dialog open={editMode} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configure Device Settings</DialogTitle>
              <DialogDescription>
                Customize notification preferences and thresholds for {selectedDevice.name}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="thresholds" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              
              <TabsContent value="thresholds" className="mt-4">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Water Level Threshold ({waterLevelThreshold}%)</Label>
                      <span className={getWaterLevelColor(waterLevelThreshold)}>
                        {waterLevelThreshold > 85 ? "Critical" : waterLevelThreshold > 65 ? "Warning" : "Normal"}
                      </span>
                    </div>
                    <Slider 
                      defaultValue={[selectedDevice.thresholds?.waterLevel || 80]} 
                      max={100} 
                      step={1}
                      onValueChange={(value) => setWaterLevelThreshold(value[0])}
                    />
                    <p className="text-sm text-muted-foreground">
                      Alert when water level exceeds this percentage of capacity
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Bin Fullness Threshold ({binFullnessThreshold}%)</Label>
                      <span className={getBinFullnessColor(binFullnessThreshold)}>
                        {binFullnessThreshold > 85 ? "Critical" : binFullnessThreshold > 65 ? "Warning" : "Normal"}
                      </span>
                    </div>
                    <Slider 
                      defaultValue={[selectedDevice.thresholds?.binFullness || 80]} 
                      max={100} 
                      step={1}
                      onValueChange={(value) => setBinFullnessThreshold(value[0])}
                    />
                    <p className="text-sm text-muted-foreground">
                      Alert when bin fullness exceeds this percentage
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label>Waste Weight Threshold ({wasteWeightThreshold} kg)</Label>
                      <span className={getBinWeightColor(wasteWeightThreshold)}>
                        {wasteWeightThreshold > 85 ? "Critical" : wasteWeightThreshold > 65 ? "Warning" : "Normal"}
                      </span>
                    </div>
                    <Slider 
                      defaultValue={[selectedDevice.thresholds?.wasteWeight || 80]} 
                      max={100} 
                      step={1}
                      onValueChange={(value) => setWasteWeightThreshold(value[0])}
                    />
                    <p className="text-sm text-muted-foreground">
                      Alert when waste weight exceeds this many kilograms
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notifications">Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts when thresholds are exceeded
                      </p>
                    </div>
                    <Switch 
                      id="notifications" 
                      checked={notificationsEnabled}
                      onCheckedChange={(checked) => setNotificationsEnabled(checked)}
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-base font-medium mb-3">Alert Types</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="water-level-alerts" 
                          checked={notifyOnWaterLevel}
                          onCheckedChange={(checked) => setNotifyOnWaterLevel(!!checked)}
                        />
                        <Label htmlFor="water-level-alerts" className="cursor-pointer">
                          Water Level Alerts
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="bin-fullness-alerts" 
                          checked={notifyOnBinFullness}
                          onCheckedChange={(checked) => setNotifyOnBinFullness(!!checked)}
                        />
                        <Label htmlFor="bin-fullness-alerts" className="cursor-pointer">
                          Bin Fullness Alerts
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="weight-alerts" 
                          checked={notifyOnWeight}
                          onCheckedChange={(checked) => setNotifyOnWeight(!!checked)}
                        />
                        <Label htmlFor="weight-alerts" className="cursor-pointer">
                          Weight Alerts
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-base font-medium mb-3">Notify Contacts</h3>
                    <div className="space-y-3">
                      {contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No contacts found. Add contacts in the Contacts page.
                        </p>
                      ) : (
                        contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center gap-2">
                            <Checkbox 
                              id={`contact-${contact.id}`} 
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedContacts([...selectedContacts, contact.id]);
                                } else {
                                  setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                }
                              }}
                            />
                            <Label htmlFor={`contact-${contact.id}`} className="cursor-pointer">
                              {contact.name} ({contact.phone})
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleUpdateDevice}>Save Settings</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Water Level</TableHead>
                  <TableHead>Bin Fullness</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const waterLevel = waterLevels[device.id];
                  const wasteBin = wasteBins[device.id];
                    
                  // Check if device is active (updated in the last 5 minutes)
                  const lastUpdatedWater = waterLevel?.lastUpdated ? new Date(waterLevel.lastUpdated) : null;
                  const lastEmptiedBin = wasteBin?.lastEmptied ? new Date(wasteBin.lastEmptied) : null;
                    
                  // Device is active if any sensor has been updated in the last 5 minutes
                  const isActive = (
                    (lastUpdatedWater && lastUpdatedWater >= fiveMinutesAgo) ||
                    (lastEmptiedBin && lastEmptiedBin >= fiveMinutesAgo)
                  );
                  
                  // Get last updated time
                  const lastUpdated = lastUpdatedWater && lastEmptiedBin 
                  ? new Date(Math.max(lastUpdatedWater.getTime(), lastEmptiedBin.getTime())).toLocaleString()
                  : (lastUpdatedWater 
                      ? new Date(lastUpdatedWater).toLocaleString() 
                      : (lastEmptiedBin 
                          ? new Date(lastEmptiedBin).toLocaleString() 
                          : 'Never'
                        )
                    );

                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "outline"} className={isActive ? "" : "bg-gray-100 text-gray-500"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={getWaterLevelColor(waterLevel?.level || 0)}>
                          {waterLevel?.level || 0}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={getBinFullnessColor(wasteBin?.fullness || 0)}>
                          {wasteBin?.fullness || 0}%
                        </div>
                      </TableCell>
                      <TableCell>{wasteBin?.weight || 0} kg</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {lastUpdated}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setLocation(`/water-level-details?id=${device.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500"
                            onClick={() => handleEditDevice(device)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-500">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}