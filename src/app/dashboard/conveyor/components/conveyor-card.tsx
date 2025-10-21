
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConveyorCardProps {
  device: any;
  onToggle: () => void;
}

export default function ConveyorCard({ device, onToggle }: ConveyorCardProps) {
  const isConveyorOn = device.manualConveyor === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Power className={cn("h-6 w-6", isConveyorOn ? "text-success" : "text-muted-foreground")} />
          <div>
            <CardTitle>{device.name}</CardTitle>
            <CardDescription>Location: {device.location}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
        <p className="font-medium text-muted-foreground">
          Conveyor is {isConveyorOn ? "ON" : "OFF"}
        </p>
        <Button onClick={onToggle} variant={isConveyorOn ? "destructive" : "default"} className="w-32">
          {isConveyorOn ? "Turn OFF" : "Turn ON"}
        </Button>
      </CardContent>
    </Card>
  );
}
