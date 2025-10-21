"use client";

import React, { useState } from "react";
import { useUser, useDatabase, useAuth } from "@/firebase";
import useRtdbValue from "@/firebase/rtdb/use-rtdb-value";
import { ref, update, remove } from "firebase/database";
import AccountInfoCard from "./components/account-info-card";
import NotificationsCard from "./components/notifications-card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import useFCM from "@/firebase/messaging/use-fcm";
import ChangePasswordCard from "./components/change-password-card";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useAuth();
  const { database } = useDatabase();
  const settingsPath = user ? `users/${user.uid}/settings` : "";
  const { data: settings, loading: settingsLoading } = useRtdbValue(settingsPath);
  const { toast } = useToast();
  const { token, requestPermission, deleteToken: deleteFCMToken } = useFCM();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to change your password." });
        return;
    }
    
    setIsChangingPassword(true);

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Password Change Failed",
            description: error.message || "An unknown error occurred.",
        });
    } finally {
        setIsChangingPassword(false);
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
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
                <AccountInfoCard user={user} />
                <NotificationsCard
                    isEnabled={isPushEnabled}
                    onToggle={handleTogglePushNotifications}
                    isSubscribing={isSubscribing}
                />
            </div>
            <div className="space-y-6">
                 <ChangePasswordCard
                    onChangePassword={handleChangePassword}
                    isChanging={isChangingPassword}
                 />
            </div>
        </div>
      )}
    </div>
  );
}
