"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface PushNotificationsCardProps {
  isEnabled: boolean;
  onToggle: () => void;
  isSubscribing: boolean;
}

export default function PushNotificationsCard({ isEnabled, onToggle, isSubscribing }: PushNotificationsCardProps) {

  return (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>
                Receive instant alerts for critical system events and device status changes.
                </CardDescription>
            </div>
        </div>
        <Badge variant={isEnabled ? "success" : "destructive"} className={isEnabled ? 'bg-success' : ''}>
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
          <div>
            <h4 className="font-semibold">Enable Push Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Get notified about critical alerts even when the app is closed.
            </p>
          </div>
          <Button onClick={onToggle} variant={isEnabled ? "destructive" : "default"} disabled={isSubscribing}>
            {isSubscribing ? "Subscribing..." : (isEnabled ? "Disable" : "Enable")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
