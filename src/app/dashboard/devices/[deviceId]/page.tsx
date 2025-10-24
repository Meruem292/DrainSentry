
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser, useDatabase } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import OverviewCards from "../../components/overview-cards";
import WaterLevelChart from "../../components/water-level-chart";
import MethaneLevelChart from "../../components/methane-level-chart";
import WasteBinStatus from "../../components/waste-bin-status";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar as CalendarIcon, Droplet, Trash2, Weight, Info, AlertTriangle } from "lucide-react";
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
import { addDays, format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import DeviceHealthReport from "../../components/device-health-report";


const parseTimestamp = (timestamp: string): Date => {
    if (!timestamp) return new Date(0);
    const parts = timestamp.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{1,2}):(\d{2}):(\d{2})/);
    if (!parts) return new Date(timestamp); // Fallback for different formats
    const [, month, day, year, hours, minutes, seconds] = parts.map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
};


const ITEMS_PER_PAGE = 10;

const DeviceHistoryTable = ({ history, type, loading, thresholds, setDate }: { history: any[], type: 'water' | 'fullness' | 'weight', loading: boolean, thresholds: any, setDate: (date: DateRange | undefined) => void }) => {
    const [currentPage, setCurrentPage] = React.useState(1);
    
    if (loading) return <Skeleton className="h-64 w-full" />;
    
    const getValueClass = (value: number, threshold: number) => {
        if (!value || !threshold) return "";
        if (value >= threshold) return "text-destructive font-bold";
        if (value >= threshold / 2) return "text-warning font-semibold";
        return "text-success font-semibold";
    };

    const hasData = history && history.length > 0;
    
    const totalPages = hasData ? Math.ceil(history.length / ITEMS_PER_PAGE) : 1;
    const paginatedHistory = hasData ? history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) : [];

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };
    
    if (!hasData) {
        return (
          <Card className="h-96 flex items-center justify-center">
            <CardContent className="text-center">
              <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900/50">
                      <Info className="h-8 w-8 text-blue-500" />
                  </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4">
                There are no sensor readings for this device on the selected date.
              </p>
              <Button onClick={() => setDate({from: new Date(), to: new Date()})}>Try Today's Date</Button>
            </CardContent>
          </Card>
        );
    }
    
    return (
        <div>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Timestamp</TableHead>
                            {type === 'water' && <TableHead className="text-right">Level (%)</TableHead>}
                            {type === 'fullness' && <TableHead className="text-right">Fullness (%)</TableHead>}
                            {type === 'weight' && <TableHead className="text-right">Weight (kg)</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedHistory.map((entry: any, index) => {
                            const isWaste = type === 'fullness' || type === 'weight';
                            const value = isWaste ? entry.filled : entry.level;
                            const threshold = isWaste ? thresholds?.binFullness || 80 : thresholds?.waterLevel || 80;
                            const weightValue = type === 'weight' ? entry.weight : (isWaste ? entry.weight : 0);
                            const weightThreshold = thresholds?.wasteWeight || 30;

                            // Determine the highest severity for the row
                            let rowStatusClass = "text-success";
                            if (type === 'water') {
                                rowStatusClass = getValueClass(value, threshold);
                            } else if(type === 'fullness') {
                                rowStatusClass = getValueClass(value, threshold);
                            } else if(type === 'weight') {
                                rowStatusClass = getValueClass(weightValue, weightThreshold);
                            }
                            
                            return (
                            <TableRow key={index}>
                                <TableCell className={cn(rowStatusClass, 'font-semibold')}>{parseTimestamp(entry.timestamp).toLocaleString()}</TableCell>
                                {type === 'water' && <TableCell className={cn("text-right", getValueClass(entry.level, thresholds?.waterLevel || 80))}>{entry.level}</TableCell>}
                                {type === 'fullness' && <TableCell className={cn("text-right", getValueClass(entry.filled, thresholds?.binFullness || 80))}>{entry.filled ?? 'N/A'}</TableCell>}
                                {type === 'weight' && <TableCell className={cn("text-right", getValueClass(entry.weight, thresholds?.wasteWeight || 30))}>{entry.weight ?? 'N/A'}</TableCell>}
                            </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
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
            const from = startOfDay(date.from!);
            const to = date.to ? startOfDay(addDays(date.to, 1)) : startOfDay(addDays(from, 1));
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
        <DeviceHealthReport device={device} filteredHistory={filteredHistory} />
      </div>

       <div>
        <Tabs defaultValue="water">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="water"><Droplet className="mr-2 h-4 w-4" />Water Level</TabsTrigger>
                <TabsTrigger value="fullness"><Trash2 className="mr-2 h-4 w-4" />Bin Fullness</TabsTrigger>
                <TabsTrigger value="weight"><Weight className="mr-2 h-4 w-4" />Bin Weight</TabsTrigger>
            </TabsList>
            <TabsContent value="water" className="pt-4">
                <DeviceHistoryTable history={filteredHistory.water} type="water" loading={loading} thresholds={device?.thresholds} setDate={setDate} />
            </TabsContent>
            <TabsContent value="fullness" className="pt-4">
                <DeviceHistoryTable history={filteredHistory.waste} type="fullness" loading={loading} thresholds={device?.thresholds} setDate={setDate} />
            </TabsContent>
            <TabsContent value="weight" className="pt-4">
                 <DeviceHistoryTable history={filteredHistory.waste} type="weight" loading={loading} thresholds={device?.thresholds} setDate={setDate} />
            </TabsContent>
        </Tabs>
       </div>
    </div>
  );
}
