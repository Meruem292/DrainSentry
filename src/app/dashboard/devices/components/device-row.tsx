
"use client";

import React from 'react';
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart, ChevronDown, Eye, Pencil, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
    return date.toLocaleString();
}

const DetailItem = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (
    <div className={cn("flex justify-between items-center", className)}>
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-right">{children}</span>
    </div>
);


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

    const renderActions = () => (
        <div className="flex justify-center items-center gap-1 md:gap-2">
            <Link href={`/dashboard/devices/${device.id}`} legacyBehavior>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="View Charts">
                    <BarChart className="h-4 w-4" />
                </Button>
            </Link>
            <Link href={`/dashboard/devices/${device.id}`} legacyBehavior>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="View Details">
                    <Eye className="h-4 w-4" />
                </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(device)} aria-label="Edit Device">
                <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive" aria-label="Delete Device">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );

    return (
        <Collapsible asChild>
            <div className="contents">
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                    <div className="col-span-2 flex items-center gap-2 font-semibold">
                        <span className={cn("h-2 w-2 rounded-full", isActive ? 'bg-success' : 'bg-destructive')}></span>
                        {device.name}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate">{device.location}</div>
                    <div className="col-span-1">
                        <Badge variant={isActive ? "success" : "destructive"} className={cn(!isActive && "bg-muted text-muted-foreground")}>
                            {isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                    <div className="col-span-1 text-center text-sm">
                        <p className={cn("font-bold", latestData.waterLevel >= waterThreshold ? "text-destructive" : "text-foreground")}>{latestData.waterLevel}%</p>
                        <p className="text-xs text-muted-foreground">Thresh: {waterThreshold}%</p>
                    </div>
                    <div className="col-span-1 text-center text-sm">
                        <p className={cn("font-bold", latestData.binFullness >= binThreshold ? "text-destructive" : "text-foreground")}>{latestData.binFullness}%</p>
                        <p className="text-xs text-muted-foreground">Thresh: {binThreshold}%</p>
                    </div>
                    <div className="col-span-1 text-center text-sm">
                        <p className={cn("font-bold", latestData.binWeight >= weightThreshold ? "text-destructive" : "text-foreground")}>{latestData.binWeight} kg</p>
                        <p className="text-xs text-muted-foreground">Thresh: {weightThreshold} kg</p>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">{formatLastUpdated(latestData.lastUpdated)}</div>
                    <div className="col-span-2">{renderActions()}</div>
                </div>

                {/* Mobile View */}
                <div className='md:hidden border-b last:border-b-0'>
                    <CollapsibleTrigger asChild>
                         <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 w-full">
                            <div className="flex items-center gap-3">
                                <span className={cn("h-2.5 w-2.5 rounded-full", isActive ? 'bg-success' : 'bg-destructive')}></span>
                                <div>
                                    <p className="font-semibold text-base">{device.name}</p>
                                    <p className="text-xs text-muted-foreground">{device.id}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                View Details <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 pt-0 bg-muted/30">
                        <div className="space-y-3">
                            <DetailItem label="Status">
                                <Badge variant={isActive ? "success" : "destructive"} className={cn(!isActive && "bg-muted text-muted-foreground")}>
                                    {isActive ? "Active" : "Inactive"}
                                </Badge>
                            </DetailItem>
                             <DetailItem label="Location">
                                {device.location}
                            </DetailItem>
                            <DetailItem label="Last Updated">
                                {formatLastUpdated(latestData.lastUpdated)}
                            </DetailItem>
                             <DetailItem label="Water Level">
                                <span className={cn("font-bold", latestData.waterLevel >= waterThreshold ? "text-destructive" : "text-foreground")}>{latestData.waterLevel}%</span>
                            </DetailItem>
                             <DetailItem label="Bin Fullness">
                                <span className={cn("font-bold", latestData.binFullness >= binThreshold ? "text-destructive" : "text-foreground")}>{latestData.binFullness}%</span>
                            </DetailItem>
                             <DetailItem label="Bin Weight">
                                <span className={cn("font-bold", latestData.binWeight >= weightThreshold ? "text-destructive" : "text-foreground")}>{latestData.binWeight} kg</span>
                            </DetailItem>
                            <div className="flex items-center justify-end pt-2">
                               {renderActions()}
                            </div>
                        </div>
                    </CollapsibleContent>
                </div>
            </div>
        </Collapsible>
    )
}
