
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface EditDeviceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: any;
  contacts: any[];
  onSave: (deviceId: string, settings: { thresholds: any, notifications: any, hardware: any }) => void;
}

const getStatus = (value: number, threshold: number) => {
    if (value >= threshold) return { text: "Warning", className: "text-warning" };
    return { text: "Normal", className: "text-success" };
}

export default function EditDeviceDialog({ isOpen, onOpenChange, device, contacts, onSave }: EditDeviceDialogProps) {
  // Thresholds state
  const [waterLevel, setWaterLevel] = useState(80);
  const [binFullness, setBinFullness] = useState(80);
  const [wasteWeight, setWasteWeight] = useState(30);

  // Hardware state
  const [binHeight, setBinHeight] = useState(100);
  const [loadcellCalibration, setLoadcellCalibration] = useState(0);
  const [sensorReadInterval, setSensorReadInterval] = useState(1000);
  const [configFetchInterval, setConfigFetchInterval] = useState(300000);
  const [dataSendInterval, setDataSendInterval] = useState(60000);
  const [findDeviceInterval, setFindDeviceInterval] = useState(60000);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyOnWater, setNotifyOnWater] = useState(true);
  const [notifyOnFullness, setNotifyOnFullness] = useState(true);
  const [notifyOnWeight, setNotifyOnWeight] = useState(true);
  const [notifyContacts, setNotifyContacts] = useState<string[]>([]);

  useEffect(() => {
    if (device) {
      if (device.thresholds) {
        setWaterLevel(device.thresholds.waterLevel || 80);
        setBinFullness(device.thresholds.binFullness || 80);
        setWasteWeight(device.thresholds.wasteWeight || 30);
      }
      if (device.hardware) {
        setBinHeight(device.hardware.binHeight || 100);
        setLoadcellCalibration(device.hardware.loadcellCalibration || 0);
        setSensorReadInterval(device.hardware.sensorReadInterval || 1000);
        setConfigFetchInterval(device.hardware.configFetchInterval || 300000);
        setDataSendInterval(device.hardware.dataSendInterval || 60000);
        setFindDeviceInterval(device.hardware.findDeviceInterval || 60000);
      }
      if (device.notifications) {
        setNotificationsEnabled(device.notifications.enabled ?? true);
        setNotifyOnWater(device.notifications.notifyOnWaterLevel ?? true);
        setNotifyOnFullness(device.notifications.notifyOnBinFullness ?? true);
        setNotifyOnWeight(device.notifications.notifyOnWeight ?? true);
        setNotifyContacts(device.notifications.notifyContacts || []);
      }
    }
  }, [device]);

  const handleSave = () => {
    const settings = {
        thresholds: { waterLevel, binFullness, wasteWeight },
        notifications: { 
            enabled: notificationsEnabled,
            notifyOnWaterLevel: notifyOnWater,
            notifyOnBinFullness: notifyOnFullness,
            notifyOnWeight: notifyOnWeight,
            notifyContacts: notifyContacts
        },
        hardware: {
            binHeight,
            loadcellCalibration,
            sensorReadInterval,
            configFetchInterval,
            dataSendInterval,
            findDeviceInterval,
        }
    };
    onSave(device.id, settings);
  };

  const handleContactToggle = (contactId: string) => {
    setNotifyContacts(prev => 
        prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    )
  }
  
  const waterStatus = getStatus(waterLevel, 80);
  const fullnessStatus = getStatus(binFullness, 80);
  const weightStatus = getStatus(wasteWeight, 30);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configure Device Settings</DialogTitle>
          <DialogDescription>
            Customize notification preferences and thresholds for {device?.name || device?.id}.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="thresholds" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="hardware">Hardware</TabsTrigger>
            </TabsList>
            <TabsContent value="thresholds" className="py-6 px-1 space-y-8">
                <div className="grid gap-2">
                    <div className='flex justify-between items-center'>
                        <Label htmlFor="water-level">Water Level Threshold ({waterLevel}%)</Label>
                        <span className={cn("text-sm font-semibold", waterStatus.className)}>{waterStatus.text}</span>
                    </div>
                    <Slider
                        id="water-level"
                        min={0}
                        max={100}
                        step={5}
                        value={[waterLevel]}
                        onValueChange={(value) => setWaterLevel(value[0])}
                    />
                    <p className='text-xs text-muted-foreground'>Alert when water level exceeds this percentage of capacity</p>
                </div>
                
                <div className="grid gap-2">
                    <div className='flex justify-between items-center'>
                        <Label htmlFor="bin-fullness">Bin Fullness Threshold ({binFullness}%)</Label>
                         <span className={cn("text-sm font-semibold", fullnessStatus.className)}>{fullnessStatus.text}</span>
                    </div>
                    <Slider
                        id="bin-fullness"
                        min={0}
                        max={100}
                        step={5}
                        value={[binFullness]}
                        onValueChange={(value) => setBinFullness(value[0])}
                    />
                     <p className='text-xs text-muted-foreground'>Alert when bin fullness exceeds this percentage</p>
                </div>

                <div className="grid gap-2">
                    <div className='flex justify-between items-center'>
                        <Label htmlFor="waste-weight">Waste Weight Threshold ({wasteWeight} kg)</Label>
                        <span className={cn("text-sm font-semibold", weightStatus.className)}>{weightStatus.text}</span>
                    </div>
                    <Slider
                        id="waste-weight"
                        min={0}
                        max={30}
                        step={1}
                        value={[wasteWeight]}
                        onValueChange={(value) => setWasteWeight(value[0])}
                    />
                    <p className='text-xs text-muted-foreground'>Alert when waste weight exceeds this many kilograms</p>
                </div>
            </TabsContent>
            <TabsContent value="notifications" className="py-6 px-1 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Label htmlFor="enable-notifications" className="font-semibold">Enable Notifications</Label>
                        <p className='text-xs text-muted-foreground'>Receive alerts when thresholds are exceeded</p>
                    </div>
                    <Switch
                        id="enable-notifications"
                        checked={notificationsEnabled}
                        onCheckedChange={setNotificationsEnabled}
                    />
                </div>
                <Separator />
                <div className="space-y-4" >
                    <h4 className="font-semibold">Alert Types</h4>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="water-alerts" checked={notifyOnWater} onCheckedChange={(checked) => setNotifyOnWater(Boolean(checked))}/>
                        <label htmlFor="water-alerts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Water Level Alerts
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="fullness-alerts" checked={notifyOnFullness} onCheckedChange={(checked) => setNotifyOnFullness(Boolean(checked))} />
                        <label htmlFor="fullness-alerts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Bin Fullness Alerts
                        </label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Checkbox id="weight-alerts" checked={notifyOnWeight} onCheckedChange={(checked) => setNotifyOnWeight(Boolean(checked))} />
                        <label htmlFor="weight-alerts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Weight Alerts
                        </label>
                    </div>
                </div>
                <Separator />
                <div className="space-y-4">
                    <h4 className="font-semibold">Notify Contacts</h4>
                    <div className="space-y-2">
                        {contacts && contacts.length > 0 ? contacts.map(contact => (
                             <div key={contact.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`contact-${contact.id}`} 
                                    checked={notifyContacts.includes(contact.id)}
                                    onCheckedChange={() => handleContactToggle(contact.id)}
                                />
                                <label htmlFor={`contact-${contact.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {contact.name} ({contact.phone})
                                </label>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">No contacts available. Add contacts from the Contacts page.</p>}
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="hardware" className="py-6 px-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="bin-height">Bin Height (cm)</Label>
                        <Input
                            id="bin-height"
                            type="number"
                            value={binHeight}
                            onChange={(e) => setBinHeight(Number(e.target.value))}
                            placeholder="e.g. 100"
                        />
                        <p className='text-xs text-muted-foreground'>The total height of the waste bin.</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="loadcell-calibration">Loadcell Calibration Factor</Label>
                        <Input
                            id="loadcell-calibration"
                            type="number"
                            value={loadcellCalibration}
                            onChange={(e) => setLoadcellCalibration(Number(e.target.value))}
                            placeholder="e.g. 430.5"
                        />
                        <p className='text-xs text-muted-foreground'>Calibration factor for weight readings.</p>
                    </div>
                </div>
                 <Separator />
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="sensor-read-interval">Sensor Read Interval (ms)</Label>
                        <Input
                            id="sensor-read-interval"
                            type="number"
                            value={sensorReadInterval}
                            onChange={(e) => setSensorReadInterval(Number(e.target.value))}
                        />
                        <p className='text-xs text-muted-foreground'>How often to read sensor data (e.g., 1000ms = 1s).</p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="data-send-interval">Data Send Interval (ms)</Label>
                        <Input
                            id="data-send-interval"
                            type="number"
                            value={dataSendInterval}
                            onChange={(e) => setDataSendInterval(Number(e.target.value))}
                        />
                        <p className='text-xs text-muted-foreground'>How often to send data to the server (e.g., 2000ms = 2s).</p>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="config-fetch-interval">Config Fetch Interval (ms)</Label>
                        <Input
                            id="config-fetch-interval"
                            type="number"
                            value={configFetchInterval}
                            onChange={(e) => setConfigFetchInterval(Number(e.target.value))}
                        />
                        <p className='text-xs text-muted-foreground'>How often to fetch remote config (e.g., 300000ms = 5min).</p>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="find-device-interval">Device Retry Interval (ms)</Label>
                        <Input
                            id="find-device-interval"
                            type="number"
                            value={findDeviceInterval}
                            onChange={(e) => setFindDeviceInterval(Number(e.target.value))}
                        />
                        <p className='text-xs text-muted-foreground'>Retry interval if device not found (e.g., 60000ms = 1min).</p>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
