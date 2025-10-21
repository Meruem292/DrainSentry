
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface EditDeviceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: any;
  onSave: (deviceId: string, thresholds: any) => void;
}

const getStatus = (value: number, threshold: number) => {
    if (value >= threshold) return { text: "Warning", className: "text-warning" };
    return { text: "Normal", className: "text-success" };
}

export default function EditDeviceDialog({ isOpen, onOpenChange, device, onSave }: EditDeviceDialogProps) {
  const [waterLevel, setWaterLevel] = useState(80);
  const [binFullness, setBinFullness] = useState(80);
  const [wasteWeight, setWasteWeight] = useState(30);

  useEffect(() => {
    if (device?.thresholds) {
      setWaterLevel(device.thresholds.waterLevel || 80);
      setBinFullness(device.thresholds.binFullness || 80);
      setWasteWeight(device.thresholds.wasteWeight || 30);
    }
  }, [device]);

  const handleSave = () => {
    onSave(device.id, { waterLevel, binFullness, wasteWeight });
  };
  
  const waterStatus = getStatus(waterLevel, 80);
  const fullnessStatus = getStatus(binFullness, 80);
  const weightStatus = getStatus(wasteWeight, 50);

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
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
                        max={100}
                        step={1}
                        value={[wasteWeight]}
                        onValueChange={(value) => setWasteWeight(value[0])}
                    />
                    <p className='text-xs text-muted-foreground'>Alert when waste weight exceeds this many kilograms</p>
                </div>
            </TabsContent>
            <TabsContent value="notifications">
                <div className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">Notification settings coming soon.</p>
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
