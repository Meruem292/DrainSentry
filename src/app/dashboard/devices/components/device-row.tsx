
"use client";

import React from 'react';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart, Eye, Pencil, Trash2 } from "lucide-react";

const parseTimestamp = (timestamp: string): Date => {
    if (!timestamp) return new Date(0);
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(timestamp);
    const [, month, day, year, hours, minutes, seconds] = parts.map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
};

const formatLastUpdated = (timestamp?: string) => {
    if (!timestamp) return "Never";
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "Never";
    return date.toLocaleDateString();
}

export default function DeviceRow({ device, onEdit }: { device: any, onEdit: (device: any) => void }) {

    const latestData = React.useMemo(() => {
        let waterLevel = 0;
        let binFullness = 0;
        let binWeight = 0;
        let lastUpdated: string | undefined;

        const allTimestamps: Date[] = [];

        if (device.waterLevelHistory) {
            const sorted = Object.values(device.waterLevelHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
            if (sorted.length > 0) {
                waterLevel = sorted[0].level;
                allTimestamps.push(parseTimestamp(sorted[0].timestamp));
            }
        }
        if (device.wasteBinHistory) {
            const sorted = Object.values(device.wasteBinHistory).sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
            if (sorted.length > 0) {
                binFullness = sorted[0].fullness;
                binWeight = sorted[0].weight;
                allTimestamps.push(parseTimestamp(sorted[0].timestamp));
            }
        }
        
        if(device.lastSeen) {
            allTimestamps.push(parseTimestamp(device.lastSeen));
        }
        
        if (allTimestamps.length > 0) {
            const mostRecent = new Date(Math.max.apply(null, allTimestamps.map(d => d.getTime())));
            lastUpdated = mostRecent.toLocaleString();
        }

        return { waterLevel, binFullness, binWeight, lastUpdated };

    }, [device]);

    const waterThreshold = device.thresholds?.waterLevel ?? 80;
    const binThreshold = device.thresholds?.binFullness ?? 80;
    const weightThreshold = device.thresholds?.wasteWeight ?? 30;

    const isActive = device.status === 'active';

    return (
        <div className="grid grid-cols-12 gap-4 items-center p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
            <div className="col-span-2 flex items-center gap-2 font-semibold">
                <span className={cn("h-2 w-2 rounded-full", isActive ? 'bg-success' : 'bg-destructive')}></span>
                {device.name}
            </div>
            <div className="col-span-1 text-sm text-muted-foreground">{device.id}</div>
            <div className="col-span-2 text-sm text-muted-foreground">{device.location}</div>
            <div className="col-span-1">
                <Badge variant={isActive ? "default" : "destructive"} className={cn(!isActive && "bg-muted text-muted-foreground", isActive && "bg-success hover:bg-success/80")}>
                    {isActive ? "Active" : "Inactive"}
                </Badge>
            </div>
            <div className="col-span-1 text-center text-sm">
                <p className={cn("font-bold", latestData.waterLevel >= waterThreshold ? "text-destructive" : "text-foreground")}>{latestData.waterLevel}%</p>
                <p className="text-xs text-muted-foreground">Threshold: {waterThreshold}%</p>
            </div>
             <div className="col-span-1 text-center text-sm">
                <p className={cn("font-bold", latestData.binFullness >= binThreshold ? "text-destructive" : "text-foreground")}>{latestData.binFullness}%</p>
                <p className="text-xs text-muted-foreground">Threshold: {binThreshold}%</p>
            </div>
             <div className="col-span-1 text-center text-sm">
                <p className={cn("font-bold", latestData.binWeight >= weightThreshold ? "text-destructive" : "text-foreground")}>{latestData.binWeight} kg</p>
                <p className="text-xs text-muted-foreground">Threshold: {weightThreshold} kg</p>
            </div>
            <div className="col-span-1 text-sm text-muted-foreground">{formatLastUpdated(latestData.lastUpdated)}</div>
            <div className="col-span-2 flex justify-center items-center gap-2">
                 <Link href={`/dashboard/devices/${device.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <BarChart className="h-4 w-4" />
                    </Button>
                </Link>
                <Link href={`/dashboard/devices/${device.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Eye className="h-4 w-4" />
                    </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(device)}>
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
