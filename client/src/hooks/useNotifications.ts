import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { ref, set, remove, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { NotificationService } from "@/lib/notifications";
import { useToast } from "./use-toast";

export interface NotificationAlert {
  type: "water_level" | "waste_bin" | "device_offline";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  deviceId?: number;
}

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const HARDCODED_FCM_TOKEN =
    "BAiBMAW5a6LDGPSMz7T_GFqCXtY7i3v_dM34mynRvlFmkFpj7ugH_J692Kt9022jzl7kpvFuk6nmc9YwcK9ofiE";
  const [fcmToken, setFcmToken] = useState<string | null>(HARDCODED_FCM_TOKEN);
  const [notificationService] = useState(() =>
    NotificationService.getInstance()
  );
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<Error | null>(null);

  useEffect(() => {
    const checkPermission = () => {
      if ("Notification" in window) {
        setPermissionGranted(Notification.permission === "granted");
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
      deviceInfo,
    }: {
      token: string;
      deviceInfo?: string;
    }) => {
      const tokenRef = ref(database, `fcm_tokens/${token}`);
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
    const alertsRef = ref(database, "alerts");
    const unsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const alertsData = Object.values(data) as NotificationAlert[];
          setAlerts(alertsData);
        } else {
          setAlerts([]);
        }
        setAlertsLoading(false);
      },
      (error) => {
        console.error("Error fetching alerts:", error);
        setAlertsError(error);
        setAlertsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const enableNotifications = async () => {
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

      const token = HARDCODED_FCM_TOKEN;
      setFcmToken(token);

      const deviceInfo = navigator.userAgent;
      registerTokenMutation.mutate({ token, deviceInfo });

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
    if (HARDCODED_FCM_TOKEN) {
      try {
        const tokenRef = ref(
          database,
          `fcm_tokens/${encodeURIComponent(HARDCODED_FCM_TOKEN)}`
        );
        await remove(tokenRef);

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
