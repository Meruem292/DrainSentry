
"use client";

import React from "react";
import { useUser, useDatabase } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { ref, update } from "firebase/database";
import AccountInfoCard from "./components/account-info-card";
import NotificationsCard from "./components/notifications-card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const { database } = useDatabase();
  const settingsPath = user ? `users/${user.uid}/settings` : "";
  const { data: settings, loading: settingsLoading } = useRtdbValue(settingsPath);
  const { toast } = useToast();

  const loading = userLoading || settingsLoading;

  const handleToggleNotifications = (currentState: boolean) => {
    if (!user || !database) return;
    const notificationsRef = ref(database, `users/${user.uid}/settings/notifications`);
    update(notificationsRef, { smsEnabled: !currentState })
      .then(() => {
        toast({
          title: "Settings Updated",
          description: `SMS notifications have been ${!currentState ? "enabled" : "disabled"}.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message,
        });
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          <AccountInfoCard user={user} />
          <NotificationsCard
            settings={settings?.notifications}
            onToggle={handleToggleNotifications}
          />
        </>
      )}
    </div>
  );
}
