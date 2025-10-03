import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ref,
  set,
  remove,
  onValue,
  query,
  orderByKey,
  limitToLast,
} from "firebase/database";
import { database } from "@/lib/firebase";
import { NotificationService } from "@/lib/notifications";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";

export interface NotificationAlert {
  type: "water_level" | "waste_bin" | "device_offline";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  deviceId?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationService] = useState(() =>
    NotificationService.getInstance()
  );
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<Error | null>(null);
  const historyListenersUnsubscribeRef = useRef<(() => void)[]>([]);
  const alertsMapRef = useRef<Map<string, NotificationAlert>>(new Map());

  useEffect(() => {
    const checkPermission = async () => {
      if ("Notification" in window) {
        const currentPermission = Notification.permission;
        setPermissionGranted(currentPermission === "granted");
        if (currentPermission === "granted") {
          const currentToken = await notificationService.getToken();
          setFcmToken(currentToken);
        }
      }
    };
    checkPermission();

    if (Notification.permission === "granted") {
      notificationService.setupForegroundMessageListener((payload) => {
        toast({
          title: payload.notification?.title || "Alert",
          description:
            payload.notification?.body || "You have a new notification",
          variant:
            payload.data?.severity === "critical" ? "destructive" : "default",
        });
      });
    }
  }, [notificationService, toast]);

  const registerTokenMutation = useMutation({
    mutationFn: async ({
      token,
      userId,
      deviceInfo,
    }: {
      token: string;
      userId: string;
      deviceInfo?: string;
    }) => {
      // Store token under the user's specific path
      const tokenRef = ref(database, `users/${userId}/fcm_tokens/${token}`);
      await set(tokenRef, {
        token,
        deviceInfo,
        timestamp: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Notifications enabled",
        description:
          "You will now receive push notifications for critical alerts.",
      });
    },
    onError: (error) => {
      console.error("Error registering token:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setAlertsLoading(false);
      return;
    }

    setAlertsLoading(true);
    const devicesRef = ref(database, `users/${user.uid}/devices`);

    const devicesListenerUnsubscribe = onValue(
      devicesRef,
      (snapshot) => {
        historyListenersUnsubscribeRef.current.forEach((unsub) => unsub());
        historyListenersUnsubscribeRef.current = [];
        alertsMapRef.current.clear();
        setAlerts([]);

        if (!snapshot.exists()) {
          setAlertsLoading(false);
          return;
        }

        const devices = snapshot.val();
        const deviceEntries = Object.entries(devices);

        if (deviceEntries.length === 0) {
          setAlertsLoading(false);
          return;
        }

        const updateAlertsState = () => {
          setAlerts(Array.from(alertsMapRef.current.values()));
        };

        deviceEntries.forEach(([deviceKey, device]: [string, any]) => {
          const deviceId = device.id;
          const deviceName = device.name || deviceId;

          const waterHistoryQuery = query(
            ref(
              database,
              `users/${user.uid}/devices/${deviceKey}/waterLevelHistory`
            ),
            orderByKey(),
            limitToLast(1)
          );
          const waterUnsub = onValue(waterHistoryQuery, (snap) => {
            const alertKey = `${deviceId}-water_level`;
            if (snap.exists()) {
              const [latestEntry] = Object.values(snap.val()) as {
                level: number;
              }[];
              if (
                latestEntry &&
                typeof latestEntry.level === "number" &&
                latestEntry.level > 85
              ) {
                alertsMapRef.current.set(alertKey, {
                  type: "water_level",
                  message: `Critical water level at ${deviceName}.`,
                  severity: "critical",
                  deviceId: deviceId,
                });
              } else {
                alertsMapRef.current.delete(alertKey);
              }
            } else {
              alertsMapRef.current.delete(alertKey);
            }
            updateAlertsState();
          });
          historyListenersUnsubscribeRef.current.push(waterUnsub);

          const wasteHistoryQuery = query(
            ref(
              database,
              `users/${user.uid}/devices/${deviceKey}/wasteBinHistory`
            ),
            orderByKey(),
            limitToLast(1)
          );
          const wasteUnsub = onValue(wasteHistoryQuery, (snap) => {
            const alertKey = `${deviceId}-waste_bin`;
            if (snap.exists()) {
              const [latestEntry] = Object.values(snap.val()) as {
                fullness: number;
              }[];
              if (
                latestEntry &&
                typeof latestEntry.fullness === "number" &&
                latestEntry.fullness > 85
              ) {
                alertsMapRef.current.set(alertKey, {
                  type: "waste_bin",
                  message: `Waste bin full at ${deviceName}.`,
                  severity: "critical",
                  deviceId: deviceId,
                });
              } else {
                alertsMapRef.current.delete(alertKey);
              }
            } else {
              alertsMapRef.current.delete(alertKey);
            }
            updateAlertsState();
          });
          historyListenersUnsubscribeRef.current.push(wasteUnsub);
        });
        setAlertsLoading(false);
      },
      (error) => {
        console.error("Error fetching devices:", error);
        setAlertsError(error as Error);
        setAlertsLoading(false);
      }
    );

    return () => {
      devicesListenerUnsubscribe();
      historyListenersUnsubscribeRef.current.forEach((unsub) => unsub());
      historyListenersUnsubscribeRef.current = [];
    };
  }, [user]);

  const enableNotifications = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to enable notifications.",
        variant: "destructive",
      });
      return;
    }

    try {
      const hasPermission = await notificationService.requestPermission();
      setPermissionGranted(hasPermission);

      if (!hasPermission) {
        toast({
          title: "Permission denied",
          description:
            "Please enable notifications in your browser settings to receive alerts.",
          variant: "destructive",
        });
        return;
      }

      const token = await notificationService.getToken();
      if (!token) {
        throw new Error("Could not generate FCM token.");
      }
      setFcmToken(token);

      const deviceInfo = navigator.userAgent;
      registerTokenMutation.mutate({ token, userId: user.uid, deviceInfo });

      notificationService.setupForegroundMessageListener((payload) => {
        toast({
          title: payload.notification?.title || "Alert",
          description:
            payload.notification?.body || "You have a new notification",
          variant:
            payload.data?.severity === "critical" ? "destructive" : "default",
        });
      });
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    }
  };

  const disableNotifications = async () => {
    if (fcmToken && user) {
      try {
        const tokenRef = ref(
          database,
          `users/${user.uid}/fcm_tokens/${encodeURIComponent(fcmToken)}`
        );
        await remove(tokenRef);

        await notificationService.deleteToken();

        setPermissionGranted(false);
        setFcmToken(null);

        toast({
          title: "Notifications disabled",
          description: "You will no longer receive push notifications.",
        });
      } catch (error) {
        console.error("Error disabling notifications:", error);
        toast({
          title: "Error",
          description: "Failed to disable notifications.",
          variant: "destructive",
        });
      }
    }
  };

  return {
    permissionGranted,
    fcmToken,
    alerts,
    alertsLoading,
    alertsError,
    enableNotifications,
    disableNotifications,
    registeringToken: registerTokenMutation.isPending,
  };
}