import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const bins = [
  { id: "BIN-001", location: "Main St & 1st Ave", level: 95 },
  { id: "BIN-002", location: "City Park Entrance", level: 82 },
  { id: "BIN-003", location: "Downtown Plaza", level: 76 },
  { id: "BIN-004", location: "Riverfront Path", level: 55 },
  { id: "BIN-005", location: "Library Courtyard", level: 40 },
  { id: "BIN-006", location: "West End Market", level: 98 },
  { id: "BIN-007", location: "North Station", level: 25 },
];

const getProgressClass = (level: number): string => {
    if (level > 80) return '[&>div]:bg-destructive';
    if (level > 60) return '[&>div]:bg-chart-4';
    return '[&>div]:bg-chart-2';
};

export default function WasteBinStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Waste Bin Levels</CardTitle>
        <CardDescription>Fill status for high-traffic monitored bins.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <div className="space-y-6 pr-4">
            {bins.map((bin) => (
              <div key={bin.id} className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <p className="font-medium text-sm">{bin.id} - <span className="text-muted-foreground">{bin.location}</span></p>
                  <p className="font-semibold text-sm">{bin.level}%</p>
                </div>
                <Progress value={bin.level} className={cn("h-2", getProgressClass(bin.level))} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
