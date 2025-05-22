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
  Eye,
  BarChart3
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
  const [contacts, setContacts] = useState<any[]>([]);
  
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
      // First, check if this device ID already exists in any container
      const devicesRef = ref(database, `users/${user.uid}/devices`);
      const devicesSnapshot = await get(devicesRef);
      
      if (devicesSnapshot.exists()) {
        const devicesData = devicesSnapshot.val();
        
        // Check if this device ID already exists
        let deviceExists = false;
        Object.entries(devicesData).forEach(([_, value]: [string, any]) => {
          if (value.id === deviceId.trim()) {
            deviceExists = true;
          }
        });
        
        if (deviceExists) {
          toast({
            title: "Device ID already exists",
            description: "A device with this ID already exists in your account.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Create a new device with complete information
      const newDevice = {
        id: deviceId.trim(), // Add explicit ID field 
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
      
      // Create the device entry
      const newDeviceRef = push(devicesRef);
      const containerKey = newDeviceRef.key;
      await set(newDeviceRef, newDevice);
      
      // Create water level sensor data entry
      const waterRef = ref(database, `users/${user.uid}/waterLevels/${containerKey}`);
      await set(waterRef, {
        id: deviceId.trim(),
        location: deviceLocation.trim() || "Unknown",
        level: 0,
        lastUpdated: "Never",
      });
      
      // Create waste bin sensor data entry
      const wasteRef = ref(database, `users/${user.uid}/wasteBins/${containerKey}`);
      await set(wasteRef, {
        id: deviceId.trim(),
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
      console.error("Error adding device:", error);
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
      
      // Fix the path for updating device data
      // We need to use the correct location in the Firebase database
      // Looking at the screenshot, it seems the path should be "users/{uid}/devices/device1"
      // where device1 is the actual container for the device data
      
      // First, get the correct path by finding the container key
      const devicesRef = ref(database, `users/${user.uid}/devices`);
      const devicesSnapshot = await get(devicesRef);
      
      if (devicesSnapshot.exists()) {
        const devicesData = devicesSnapshot.val();
        // Find the container key (like "device1") that contains our device
        let containerKey = null;
        
        Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
          if (value.id === selectedDevice.id) {
            containerKey = key;
          }
        });
        
        if (containerKey) {
          // Update the device with the correct path
          const deviceRef = ref(database, `users/${user.uid}/devices/${containerKey}`);
          await set(deviceRef, updatedDevice);
          
          // Update associated water level location if changed
          if (deviceLocation !== selectedDevice.location) {
            const waterRef = ref(database, `users/${user.uid}/waterLevels/${containerKey}`);
            const waterSnapshot = await get(waterRef);
            if (waterSnapshot.exists()) {
              const waterData = waterSnapshot.val();
              await set(waterRef, {
                ...waterData,
                location: deviceLocation.trim() || selectedDevice.location
              });
            }
            
            // Update associated waste bin location
            const wasteRef = ref(database, `users/${user.uid}/wasteBins/${containerKey}`);
            const wasteSnapshot = await get(wasteRef);
            if (wasteSnapshot.exists()) {
              const wasteData = wasteSnapshot.val();
              await set(wasteRef, {
                ...wasteData,
                location: deviceLocation.trim() || selectedDevice.location
              });
            }
          }
        } else {
          throw new Error("Device container not found");
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
      // If this is a row with no ID, it could be one of the problematic entries
      if (!deviceId) {
        // First, let's remove the entry from the table visually
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        
        // Then search for devices without IDs in Firebase
        const devicesRef = ref(database, `users/${user.uid}/devices`);
        const devicesSnapshot = await get(devicesRef);
        
        if (devicesSnapshot.exists()) {
          const devicesData = devicesSnapshot.val();
          
          // Find any devices that don't have an ID or have empty/null properties
          for (const [key, value] of Object.entries(devicesData)) {
            const deviceData = value as any;
            // Check if this is a problematic entry (missing ID or mostly empty)
            if (!deviceData.id || 
                (Object.keys(deviceData).length <= 2 && 
                 (deviceData.hasOwnProperty('status') || deviceData.hasOwnProperty('lastSeen')))) {
              
              // Remove this device entry
              const blankDeviceRef = ref(database, `users/${user.uid}/devices/${key}`);
              await remove(blankDeviceRef);
              
              // Also check and remove any corresponding blank entries in waterLevels
              const waterRef = ref(database, `users/${user.uid}/waterLevels/${key}`);
              const waterSnapshot = await get(waterRef);
              if (waterSnapshot.exists()) {
                await remove(waterRef);
              }
              
              // And check wasteBins
              const wasteRef = ref(database, `users/${user.uid}/wasteBins/${key}`);
              const wasteSnapshot = await get(wasteRef);
              if (wasteSnapshot.exists()) {
                await remove(wasteRef);
              }
              
              // Check for water level history
              const waterHistoryRef = ref(database, `users/${user.uid}/waterLevelHistory`);
              const waterHistorySnapshot = await get(waterHistoryRef);
              if (waterHistorySnapshot.exists()) {
                const waterHistoryData = waterHistorySnapshot.val();
                
                // Look through each date entry
                for (const [date, dateData] of Object.entries(waterHistoryData)) {
                  if (dateData && typeof dateData === 'object' && dateData.hasOwnProperty(key)) {
                    // Remove just this device's history for this date
                    const specificHistoryRef = ref(database, `users/${user.uid}/waterLevelHistory/${date}/${key}`);
                    await remove(specificHistoryRef);
                  }
                }
              }
            }
          }
        }
        
        toast({
          title: "Blank Device Removed",
          description: "The blank device entry has been removed successfully",
        });
        return;
      }
      
      // For regular devices with IDs, proceed normally
      // First, find the container key for this device ID
      const devicesRef = ref(database, `users/${user.uid}/devices`);
      const devicesSnapshot = await get(devicesRef);
      
      if (!devicesSnapshot.exists()) {
        toast({
          title: "No devices found",
          description: "No devices found in your account.",
          variant: "destructive",
        });
        return;
      }
      
      // Find the device container key
      const devicesData = devicesSnapshot.val();
      let containerKey = null;
      
      // Loop through devices to find the one with matching ID
      Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
        if (value && value.id === deviceId) {
          containerKey = key;
        }
      });
      
      if (!containerKey) {
        // If we didn't find by ID, check if the device container key itself matches
        if (devicesData.hasOwnProperty(deviceId)) {
          containerKey = deviceId;
        } else {
          toast({
            title: "Device not found",
            description: "The device could not be found in your account.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Remove device using the correct container key
      const deviceRef = ref(database, `users/${user.uid}/devices/${containerKey}`);
      await remove(deviceRef);
      
      // Remove associated water level data
      const waterRef = ref(database, `users/${user.uid}/waterLevels/${containerKey}`);
      const waterSnapshot = await get(waterRef);
      if (waterSnapshot.exists()) {
        await remove(waterRef);
      }
      
      // Remove associated waste bin data
      const wasteRef = ref(database, `users/${user.uid}/wasteBins/${containerKey}`);
      const wasteSnapshot = await get(wasteRef);
      if (wasteSnapshot.exists()) {
        await remove(wasteRef);
      }
      
      // Clean up water level history for this device
      const waterHistoryRef = ref(database, `users/${user.uid}/waterLevelHistory`);
      const waterHistorySnapshot = await get(waterHistoryRef);
      if (waterHistorySnapshot.exists()) {
        const waterHistoryData = waterHistorySnapshot.val();
        
        // Look through each date entry
        for (const [date, dateData] of Object.entries(waterHistoryData)) {
          if (dateData && typeof dateData === 'object' && 
             (dateData.hasOwnProperty(containerKey) || dateData.hasOwnProperty(deviceId))) {
            // Remove history for both container key and device ID to be thorough
            const specificHistoryRef1 = ref(database, `users/${user.uid}/waterLevelHistory/${date}/${containerKey}`);
            const specificHistoryRef2 = ref(database, `users/${user.uid}/waterLevelHistory/${date}/${deviceId}`);
            await remove(specificHistoryRef1);
            await remove(specificHistoryRef2);
          }
        }
      }
      
      toast({
        title: "Device Removed",
        description: "Your device has been removed successfully and all associated data cleaned up",
      });
    } catch (error) {
      console.error("Error removing device:", error);
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
                  <TableHead>
                    <div className="flex flex-col">
                      <span>Water Level</span>
                      <span className="text-xs text-gray-500">(Threshold)</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex flex-col">
                      <span>Bin Fullness</span>
                      <span className="text-xs text-gray-500">(Threshold)</span>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex flex-col">
                      <span>Weight</span>
                      <span className="text-xs text-gray-500">(Threshold)</span>
                    </div>
                  </TableHead>
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
                    <TableRow 
                      key={device.id} 
                      className="transition-colors duration-200 hover:bg-gray-50 hover:shadow-sm"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 pulse-animation" : "bg-gray-300"}`}></div>
                          <span className="hover:text-primary transition-colors duration-200">{device.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "outline"} className={isActive ? "" : "bg-gray-100 text-gray-500"}>
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className={getWaterLevelColor(waterLevel?.level || 0)}>
                            {waterLevel?.level || 0}%
                          </div>
                          <span className="text-xs text-gray-500 mt-1">
                            Threshold: {device.thresholds?.waterLevel || 80}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className={getBinFullnessColor(wasteBin?.fullness || 0)}>
                            {wasteBin?.fullness || 0}%
                          </div>
                          <span className="text-xs text-gray-500 mt-1">
                            Threshold: {device.thresholds?.binFullness || 80}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div>{wasteBin?.weight || 0} kg</div>
                          <span className="text-xs text-gray-500 mt-1">
                            Threshold: {device.thresholds?.wasteWeight || 80} kg
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {lastUpdated}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-green-500 hover:bg-green-50 transition-colors duration-200"
                            onClick={() => setLocation(`/device-history/${device.id}`)}
                            title="View History"
                          >
                            <BarChart3 className="h-4 w-4 hover:scale-110 transition-transform duration-200" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-blue-50 transition-colors duration-200"
                            onClick={() => setLocation(`/water-level-details?id=${device.id}`)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 hover:scale-110 transition-transform duration-200" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-500 hover:bg-blue-50 transition-colors duration-200"
                            onClick={() => handleEditDevice(device)}
                          >
                            <Pencil className="h-4 w-4 hover:scale-110 transition-transform duration-200" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:bg-red-50 transition-colors duration-200"
                              >
                                <Trash2 className="h-4 w-4 hover:scale-110 transition-transform duration-200" />
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