
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useDatabase } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import OverviewCards from "../../components/overview-cards";
import WaterLevelChart from "../../components/water-level-chart";
import MethaneLevelChart from "../../components/methane-level-chart";
import WasteBinStatus from "../../components/waste-bin-status";
import InteractiveMap from "../../components/interactive-map";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";


const parseTimestamp = (timestamp: string): Date => {
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(timestamp); // Fallback for different formats
    const [, month, day, year, hours, minutes, seconds] = parts.map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
};


const DeviceHistoryTable = ({ history, type, loading, thresholds }: { history: any[], type: 'water' | 'waste', loading: boolean, thresholds: any }) => {
    if (loading) return <Skeleton className="h-64 w-full" />;
    
    const getValueClass = (value: number, threshold: number) => {
        if (value >= threshold) return "text-destructive font-bold";
        if (value >= threshold / 2) return "text-warning font-semibold";
        return "";
    };
    
    if (!history || history.length === 0) {
      return (
        <div className="rounded-lg border h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No recent history available for the selected date range.</p>
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
                    {history.map((entry: any, index) => (
                        <TableRow key={index}>
                            <TableCell>{parseTimestamp(entry.timestamp).toLocaleString()}</TableCell>
                            {type === 'water' && <TableCell className={cn("text-right", getValueClass(entry.level, thresholds?.waterLevel || 80))}>{entry.level}</TableCell>}
                            {type === 'waste' && <TableCell className={cn("text-right", getValueClass(entry.fullness, thresholds?.binFullness || 80))}>{entry.fullness ?? 'N/A'}</TableCell>}
                            {type === 'waste' && <TableCell className={cn("text-right", getValueClass(entry.weight, thresholds?.wasteWeight || 30))}>{entry.weight ?? 'N/A'}</TableCell>}
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
  const path = user ? `users/${user.uid}/devices/${deviceId}` : "";
  const { data: device, loading } = useRtdbValue(path);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  const filteredHistory = React.useMemo(() => {
    if (!device) return { water: [], waste: [] };
    
    const filterData = (history: any) => {
        if (!history || !date?.from) return [];
        
        const dataArray = Object.values(history)
            .sort((a: any, b: any) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());

        return dataArray.filter((entry: any) => {
            const entryDate = parseTimestamp(entry.timestamp);
            const from = date.from!;
            const to = date.to ? addDays(date.to, 1) : addDays(from, 1);
            return entryDate >= from && entryDate < to;
        });
    }

    return {
        water: filterData(device.waterLevelHistory),
        waste: filterData(device.wasteBinHistory)
    }
  }, [device, date]);

  const filteredDeviceData = React.useMemo(() => {
    if (!device) return null;
    return {
      ...device,
      waterLevelHistory: filteredHistory.water,
      wasteBinHistory: filteredHistory.waste,
    }
  }, [device, filteredHistory]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
            </Button>
            {loading ? <Skeleton className="h-8 w-64" /> : <h1 className="text-2xl font-bold">{device?.name || device?.id} - <span className="text-muted-foreground">{device?.location}</span></h1>}
        </div>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
        </div>
      </div>
      
      <OverviewCards device={device} loading={loading} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WaterLevelChart device={filteredDeviceData} loading={loading}/>
        </div>
        <div className="lg:col-span-1">
          <MethaneLevelChart device={filteredDeviceData} loading={loading}/>
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
                </div>
                <DeviceHistoryTable history={filteredHistory.water} type="water" loading={loading} thresholds={device?.thresholds} />
            </div>
             <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Waste Bin History</h2>
                </div>
                <DeviceHistoryTable history={filteredHistory.waste} type="waste" loading={loading} thresholds={device?.thresholds} />
            </div>
       </div>
    </div>
  );
}
