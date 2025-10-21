
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useDatabase } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { ref, push } from "firebase/database";
import OverviewCards from "../../components/overview-cards";
import WaterLevelChart from "../../components/water-level-chart";
import MethaneLevelChart from "../../components/methane-level-chart";
import WasteBinStatus from "../../components/waste-bin-status";
import InteractiveMap from "../../components/interactive-map";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


const parseTimestamp = (timestamp: string): Date => {
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(timestamp); // Fallback for different formats
    const [, month, day, year, hours, minutes, seconds] = parts.map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
};


const DeviceHistoryTable = ({ history, type, loading }: { history: any, type: 'water' | 'waste', loading: boolean }) => {
    const data = React.useMemo(() => {
        if (!history) return [];
        return Object.values(history)
            .sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
    }, [history]);
    
    if (loading) return <Skeleton className="h-64 w-full" />;
    if (!data || data.length === 0) {
      return (
        <div className="rounded-lg border h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No recent history available.</p>
        </div>
      );
    }
    
    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Timestamp</TableHead>
                        {type === 'water' && <TableHead className="text-right">Level (%)</TableHead>}
                        {type === 'waste' && <TableHead className="text-right">Fullness (%)</TableHead>}
                        {type === 'waste' && <TableHead className="text-right">Weight (kg)</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((entry: any, index) => (
                        <TableRow key={index}>
                            <TableCell>{parseTimestamp(entry.timestamp).toLocaleString()}</TableCell>
                            {type === 'water' && <TableCell className="text-right">{entry.level}</TableCell>}
                            {type === 'waste' && <TableCell className="text-right">{entry.fullness ?? 'N/A'}</TableCell>}
                            {type === 'waste' && <TableCell className="text-right">{entry.weight ?? 'N/A'}</TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}


export default function DeviceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { deviceId } = params;
  const { user } = useUser();
  const { database } = useDatabase();
  const path = user ? `users/${user.uid}/devices/${deviceId}` : "";
  const { data: device, loading } = useRtdbValue(path);

  const handleAddWaterLevel = () => {
    if (!database || !user || !deviceId) return;
    const historyRef = ref(database, `users/${user.uid}/devices/${deviceId}/waterLevelHistory`);
    push(historyRef, {
      level: Math.floor(Math.random() * 100),
      timestamp: new Date().toLocaleString(),
    });
  };

  const handleAddWasteBin = () => {
    if (!database || !user || !deviceId) return;
    const historyRef = ref(database, `users/${user.uid}/devices/${deviceId}/wasteBinHistory`);
    push(historyRef, {
      fullness: Math.floor(Math.random() * 100),
      weight: parseFloat((Math.random() * 50).toFixed(1)),
      timestamp: new Date().toLocaleString(),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        {loading ? <Skeleton className="h-8 w-64" /> : <h1 className="text-2xl font-bold">{device?.name || device?.id} - <span className="text-muted-foreground">{device?.location}</span></h1>}
      </div>
      
      <OverviewCards device={device} loading={loading} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WaterLevelChart device={device} loading={loading}/>
        </div>
        <div className="lg:col-span-1">
          <MethaneLevelChart device={device} loading={loading}/>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <WasteBinStatus device={device} loading={loading} />
        <InteractiveMap device={device} />
      </div>

       <div className="grid gap-8 lg:grid-cols-2">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Water Level History</h2>
                    <Button onClick={handleAddWaterLevel} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4 text-primary-foreground" />
                        Add Water Level Entry
                    </Button>
                </div>
                <DeviceHistoryTable history={device?.waterLevelHistory} type="water" loading={loading} />
            </div>
             <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Waste Bin History</h2>
                    <Button onClick={handleAddWasteBin} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4 text-primary-foreground" />
                        Add Waste Bin Entry
                    </Button>
                </div>
                <DeviceHistoryTable history={device?.wasteBinHistory} type="waste" loading={loading} />
            </div>
       </div>
    </div>
  );
}
