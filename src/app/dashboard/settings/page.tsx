"use client";

import React, { useState } from "react";
import { useUser, useDatabase } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { ref, update, remove } from "firebase/database";
import AccountInfoCard from "./components/account-info-card";
import NotificationsCard from "./components/notifications-card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import useFCM from "@/firebase/messaging/use-fcm";

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const { database } = useDatabase();
  const settingsPath = user ? `users/${user.uid}/settings` : "";
  const { data: settings, loading: settingsLoading } = useRtdbValue(settingsPath);
  const { toast } = useToast();
  const { token, requestPermission, deleteToken: deleteFCMToken } = useFCM();
  const [isSubscribing, setIsSubscribing] = useState(false);

  const loading = userLoading || settingsLoading;

  const isPushEnabled = !!settings?.fcmToken;

  const handleTogglePushNotifications = async () => {
    if (!user || !database) return;

    if (isPushEnabled) {
      // Disable
      await deleteFCMToken();
      const fcmTokenRef = ref(database, `users/${user.uid}/settings/fcmToken`);
      remove(fcmTokenRef)
        .then(() => {
          toast({
            title: "Push Notifications Disabled",
            description: "You will no longer receive push notifications.",
          });
        })
        .catch((error) => {
          toast({ variant: "destructive", title: "Error", description: error.message });
        });
    } else {
      // Enable
      setIsSubscribing(true);
      const hasPermission = await requestPermission();
      if (hasPermission && token) {
        const settingsRef = ref(database, `users/${user.uid}/settings`);
        update(settingsRef, { fcmToken: token })
          .then(() => {
            toast({
              title: "Push Notifications Enabled",
              description: "You will now receive push notifications.",
            });
          })
          .catch((error) => {
            toast({ variant: "destructive", title: "Error", description: error.message });
          });
      } else {
        toast({
            variant: "destructive",
            title: "Permission Denied",
            description: "You need to allow notifications in your browser settings.",
        });
      }
      setIsSubscribing(false);
    }
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
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <AccountInfoCard user={user} />
          <NotificationsCard
            isEnabled={isPushEnabled}
            onToggle={handleTogglePushNotifications}
            isSubscribing={isSubscribing}
          />
        </>
      )}
    </div>
  );
}
