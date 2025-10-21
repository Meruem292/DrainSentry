"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Server, Wifi, WifiOff } from "lucide-react";

export default function DeviceCard({ device }: { device: any }) {

    const isActive = device.status === 'active';

    return (
        <Link href={`/dashboard/devices/${device.id}`} className="block transition-all hover:scale-105 hover:shadow-lg">
            <Card className="h-full flex flex-col">
                <CardHeader className="flex-row items-center gap-4">
                    <Server className="w-8 h-8 text-primary" />
                    <div>
                        <CardTitle>{device.name || device.id}</CardTitle>
                        <CardDescription>{device.id}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                     <p className="text-sm text-muted-foreground">{device.location}</p>
                </CardContent>
                <CardFooter>
                    <div className={cn("flex items-center gap-2 text-sm font-medium", isActive ? "text-chart-2" : "text-destructive")}>
                        {isActive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}
