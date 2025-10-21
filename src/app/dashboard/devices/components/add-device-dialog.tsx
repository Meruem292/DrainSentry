"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AddDeviceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddDevice: (device: { id: string; name: string; location: string }) => void;
}

export default function AddDeviceDialog({ isOpen, onOpenChange, onAddDevice }: AddDeviceDialogProps) {
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const { toast } = useToast();

  const handleAddClick = () => {
    if (!deviceId) {
      toast({
        variant: "destructive",
        title: "Device ID is required",
        description: "Please enter a unique ID for the device.",
      });
      return;
    }
    onAddDevice({ id: deviceId, name: deviceName, location: deviceLocation });
    // Reset fields
    setDeviceId("");
    setDeviceName("");
    setDeviceLocation("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
          <DialogDescription>
            Enter the device details to connect it to your DrainSentry system.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="device-id" className="text-right col-span-1">
              Device ID
            </Label>
            <Input
              id="device-id"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Enter device ID (required)"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="device-name" className="text-right col-span-1">
              Device Name
            </Label>
            <Input
              id="device-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Enter a friendly name for this device"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="device-location" className="text-right col-span-1">
              Location
            </Label>
            <Input
              id="device-location"
              value={deviceLocation}
              onChange={(e) => setDeviceLocation(e.target.value)}
              placeholder="Enter the device location"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddClick}>Add Device</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
