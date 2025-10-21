import OverviewCards from "./components/overview-cards";
import WaterLevelChart from "./components/water-level-chart";
import MethaneLevelChart from "./components/methane-level-chart";
import WasteBinStatus from "./components/waste-bin-status";
import InteractiveMap from "./components/interactive-map";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <OverviewCards />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WaterLevelChart />
        </div>
        <div className="lg:col-span-1">
          <MethaneLevelChart />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <WasteBinStatus />
        <Card>
            <InteractiveMap />
        </Card>
      </div>
    </div>
  );
}
