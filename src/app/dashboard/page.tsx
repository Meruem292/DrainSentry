
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, CheckCircle, Droplet, Server, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [timePeriod, setTimePeriod] = React.useState("Hourly");

  const overviewCards = [
    {
      title: "Total Devices",
      value: "1",
      icon: <BarChart className="text-primary" />,
      details: [
        { label: "0 active", color: "" },
        { label: "1 with warnings", color: "text-warning" },
      ],
      chartIcon: <BarChart className="h-8 w-8 text-muted-foreground/50" />,
      borderColor: "border-l-4 border-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Critical Water Levels",
      value: "0",
      icon: <Droplet className="text-warning" />,
      details: [
        { label: "Warning levels detected", color: "text-warning" },
        { label: "1 devices need attention", color: "" },
      ],
      chartIcon: <Droplet className="h-8 w-8 text-warning/20" />,
      borderColor: "border-l-4 border-warning",
      bgColor: "bg-warning/10"
    },
    {
      title: "Critical Waste Bins",
      value: "0",
      icon: <Trash2 className="text-success" />,
      details: [
        { label: "All normal", color: "text-success" },
      ],
      chartIcon: <Trash2 className="h-8 w-8 text-success/20" />,
      borderColor: "border-l-4 border-success",
      bgColor: "bg-success/10"
    },
    {
      title: "System Health",
      value: "All Systems Normal",
      icon: <CheckCircle className="text-success" />,
      details: [
        { label: "Network status: online", color: "" },
      ],
      chartIcon: <CheckCircle className="h-8 w-8 text-success/20" />,
      borderColor: "border-l-4 border-success",
      bgColor: "bg-success/10"
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">DrainSentry system overview</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>System Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Real-time monitoring and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time Period:</span>
            <div className="flex items-center rounded-lg bg-secondary p-1">
              {["Hourly", "Daily", "Weekly", "Monthly"].map((period) => (
                <Button
                  key={period}
                  variant={timePeriod === period ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTimePeriod(period)}
                  className={cn("px-3 py-1 h-8", timePeriod === period ? "bg-primary text-primary-foreground rounded-md" : "text-muted-foreground")}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((card, index) => (
              <Card key={index} className={cn("p-4 flex flex-col justify-between", card.borderColor, card.bgColor)}>
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-2">
                     <div className="p-2 bg-background rounded-md">
                        {card.icon}
                     </div>
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                   </div>
                  </div>

                <div className="flex justify-between items-end mt-4">
                    <div>
                        <p className={cn("text-3xl font-bold", card.title === "System Health" && "text-lg")}>{card.value}</p>
                        <div className="text-xs text-muted-foreground">
                        {card.details.map((detail, i) => (
                            <p key={i} className={detail.color}>{detail.label}</p>
                        ))}
                        </div>
                    </div>
                    <div>
                        {card.chartIcon}
                    </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline"><Server className="mr-2"/>View All Devices</Button>
            <Button variant="outline"><Droplet className="mr-2"/>Check Water Levels</Button>
            <Button variant="outline"><Trash2 className="mr-2"/>Inspect Waste Bins</Button>
            <Button variant="outline"><AlertTriangle className="mr-2"/>Review Alerts</Button>
        </div>
      </div>
    </div>
  );
}
