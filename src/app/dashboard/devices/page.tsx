
"use client";

import React from "react";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { useUser, useDatabase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import DeviceRow from "./components/device-row";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import AddDeviceDialog from "./components/add-device-dialog";
import { ref, set, update } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import EditDeviceDialog from "./components/edit-device-dialog";

export default function DevicesPage() {
  const { user } = useUser();
  const { database } = useDatabase();
  const devicesPath = user ? `users/${user.uid}/devices` : "";
  const contactsPath = user ? `users/${user.uid}/contacts` : "";

  const { data: devices, loading: devicesLoading } = useRtdbValue(devicesPath);
  const { data: contacts, loading: contactsLoading } = useRtdbValue(contactsPath);
  
  const [isAddDialogOpen, setAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedDevice, setSelectedDevice] = React.useState<any | null>(null);

  const { toast } = useToast();

  const deviceList = React.useMemo(() => {
    if (!devices) return [];
    return Object.keys(devices).map(key => ({
      id: key,
      ...devices[key],
    }));
  }, [devices]);

  const contactList = React.useMemo(() => {
    if (!contacts) return [];
    return Object.keys(contacts).map(key => ({
      id: key,
      ...contacts[key]
    }));
  }, [contacts]);

  const loading = devicesLoading || contactsLoading;

  const handleAddDevice = (device: { id: string; name: string; location: string }) => {
    if (!user || !database) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Not logged in or database not available.'
        });
        return;
    }
    
    const newDeviceRef = ref(database, `users/${user.uid}/devices/${device.id}`);
    
    set(newDeviceRef, {
        id: device.id,
        name: device.name || "Unnamed Device",
        location: device.location || "Unknown Location",
        status: 'inactive',
        lastSeen: new Date().toLocaleString(),
        manualConveyor: false,
        hardware: {
            binHeight: 100,
            loadcellCalibration: 0
        },
        notifications: {
            enabled: true,
            notifyContacts: [],
            notifyOnBinFullness: true,
            notifyOnWaterLevel: true,
            notifyOnWeight: true,
        },
        thresholds: {
            binFullness: 80,
            wasteWeight: 30,
            waterLevel: 80,
        },
        wasteBinHistory: {},
        waterLevelHistory: {}
    }).then(() => {
        toast({
            title: 'Device Added',
            description: `Device ${device.id} has been added successfully.`
        });
        setAddDialogOpen(false);
    }).catch(error => {
        toast({
            variant: 'destructive',
            title: 'Failed to add device',
            description: error.message
        });
    });
  };

  const handleEditDevice = (device: any) => {
    setSelectedDevice(device);
    setEditDialogOpen(true);
  };

  const handleSaveDeviceSettings = (deviceId: string, settings: { thresholds: any, notifications: any, hardware: any }) => {
    if (!user || !database) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Not logged in or database not available.',
      });
      return;
    }

    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    update(deviceRef, settings)
      .then(() => {
        toast({
          title: 'Settings Saved',
          description: 'Device settings have been updated.',
        });
        setEditDialogOpen(false);
      })
      .catch((error) => {
        toast({
          variant: 'destructive',
          title: 'Failed to save settings',
          description: error.message,
        });
      });
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Manage your connected DrainSentry devices</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold">Connected Devices</h3>
            <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Device
            </Button>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <div className="hidden md:grid grid-cols-12 gap-4 p-4 font-semibold text-sm text-muted-foreground border-b bg-muted/20">
                    <div className="col-span-2">Device</div>
                    <div className="col-span-2">Location</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-center">Water Level</div>
                    <div className="col-span-1 text-center">Bin Fullness</div>
                    <div className="col-span-1 text-center">Weight</div>
                    <div className="col-span-2">Last Updated</div>
                    <div className="col-span-2 text-center">Actions</div>
                </div>
                {loading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : deviceList.length > 0 ? (
                    deviceList.map(device => (
                        <DeviceRow key={device.id} device={device} onEdit={() => handleEditDevice(device)} />
                    ))
                ) : (
                    <div className="text-center p-8 text-muted-foreground">
                        No devices found.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
      <AddDeviceDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddDevice={handleAddDevice}
      />
      {selectedDevice && (
        <EditDeviceDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          device={selectedDevice}
          contacts={contactList}
          onSave={handleSaveDeviceSettings}
        />
      )}
    </div>
  );
}
