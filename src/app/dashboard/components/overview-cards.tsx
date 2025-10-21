"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WaterLevelIcon from "@/components/icons/water-level-icon";
import WasteBinIcon from "@/components/icons/waste-bin-icon";
import MethaneIcon from "@/components/icons/methane-icon";

const overviewData = [
  {
    title: "Avg. Water Level",
    value: "68%",
    change: "+2.5%",
    description: "from yesterday",
    icon: <WaterLevelIcon className="h-10 w-10 text-primary" />,
  },
  {
    title: "Bins at Capacity",
    value: "14",
    change: "-3",
    description: "from last week",
    icon: <WasteBinIcon className="h-10 w-10 text-primary" />,
  },
  {
    title: "Methane Levels",
    value: "4.2 ppm",
    change: "+0.1 ppm",
    description: "but within safe limits",
    icon: <MethaneIcon className="h-10 w-10 text-primary" />,
  },
];

export default function OverviewCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {overviewData.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            {item.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{item.change}</span>
              {" "}
              {item.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
