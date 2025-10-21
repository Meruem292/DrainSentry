
"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Clock, MapPin, Trash2 } from "lucide-react";

const parseTimestamp = (timestamp: string): Date => {
    if (!timestamp) return new Date(0);
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(timestamp);
    const [, month, day, year, hours, minutes, seconds] = parts.map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
};

export default function DeviceOverviewCard({ device }: { device: any }) {

    const latestData = React.useMemo(() => {
        let binFullness = 0;
        let binWeight = 0;
        let lastEmptied = "Never";
        let waterLevel = 0;
        let waterLevelTime = "Never";
        
        if (device?.wasteBinHistory) {
            const sortedWaste = Object.values(device.wasteBinHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
            if (sortedWaste.length > 0) {
                binFullness = sortedWaste[0].fullness;
                binWeight = sortedWaste[0].weight;
                
                const emptiedEntry = sortedWaste.find((entry: any) => entry.fullness < 10);
                if (emptiedEntry) {
                    lastEmptied = parseTimestamp(emptiedEntry.timestamp).toLocaleDateString();
                }
            }
        }
        
        if (device?.waterLevelHistory) {
            const sortedWater = Object.values(device.waterLevelHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
            if (sortedWater.length > 0) {
                waterLevel = sortedWater[0].level;
                waterLevelTime = parseTimestamp(sortedWater[0].timestamp).toLocaleTimeString();
            }
        }
        
        return { binFullness, binWeight, lastEmptied, waterLevel, waterLevelTime };
    }, [device]);

    const weightCapacity = 30; // Max capacity is 30kg
    const weightPercentage = (latestData.binWeight / weightCapacity) * 100;

    const getBinStatus = (fullness: number) => {
        const threshold = device.thresholds?.binFullness || 80;
        if (fullness >= threshold) return { text: "Full", className: "bg-destructive text-destructive-foreground" };
        if (fullness >= threshold * 0.75) return { text: "High", className: "bg-warning text-warning-foreground" };
        return { text: "Normal", className: "bg-success text-success-foreground" };
    };

    const getWaterStatus = (level: number) => {
        const threshold = device.thresholds?.waterLevel || 80;
        if (level >= threshold) return { text: "Warning", className: "bg-warning text-warning-foreground" };
        return { text: "Normal", className: "bg-transparent text-muted-foreground" };
    };
    
    return (
        <Link href={`/dashboard/devices/${device.key}`} className="block transition-all hover:scale-[1.02] hover:shadow-xl">
            <Card className="flex flex-col bg-card/50 h-full">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Trash2 className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold">{device.name}</CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs">
                                    <MapPin className="w-3 h-3" /> {device.location}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant={device.status === 'active' ? 'default' : 'destructive'} className={cn(device.status !== 'active' && "bg-muted text-muted-foreground")}>
                            {device.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold">Bin Fullness</span>
                                <Badge variant="outline" className={cn("text-xs", getBinStatus(latestData.binFullness).className)}>{getBinStatus(latestData.binFullness).text}</Badge>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Current: {latestData.binFullness}%</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last emptied: {latestData.lastEmptied}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">Weight</span>
                                <span className="font-bold">{latestData.binWeight} kg</span>
                            </div>
                            <Progress value={weightPercentage} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Capacity: {weightCapacity}kg</span>
                                <span>{Math.round(weightPercentage)}% full</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">Water Level</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-xs", getWaterStatus(latestData.waterLevel).className)}>{getWaterStatus(latestData.waterLevel).text}</Badge>
                                <span className="font-bold text-lg">{latestData.waterLevel}%</span>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                            <Clock className="w-3 h-3" /> {latestData.waterLevelTime}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground justify-between bg-background/50 py-2 px-4 rounded-b-lg">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last seen: {device.lastSeen}
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}
