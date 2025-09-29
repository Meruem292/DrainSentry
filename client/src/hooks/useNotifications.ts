import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '@/lib/notifications';
import { useToast } from './use-toast';

export interface NotificationAlert {
  type: 'water_level' | 'waste_bin' | 'device_offline';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  deviceId?: number;
}

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationService] = useState(() => NotificationService.getInstance());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check current permission status without auto-requesting
  useEffect(() => {
    const checkPermission = () => {
      if ('Notification' in window) {
        setPermissionGranted(Notification.permission === 'granted');
      }
    };

    checkPermission();
    
    // Only set up message listener if permission already granted
    if (Notification.permission === 'granted') {
      notificationService.setupForegroundMessageListener((payload) => {
        toast({
          title: payload.notification?.title || 'Alert',
          description: payload.notification?.body || 'You have a new notification',
          variant: payload.data?.severity === 'critical' ? 'destructive' : 'default',
        });
      });
    }
  }, [notificationService, toast]);

  // Register FCM token with backend
  const registerTokenMutation = useMutation({
    mutationFn: async ({ token, deviceInfo }: { token: string; deviceInfo?: string }) => {
      const response = await fetch('/api/notifications/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceInfo }),
      });
      
      if (response.status === 401) {
        throw new Error('Authentication required. Please sign in again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register token');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive push notifications for critical alerts.',
      });
      // Invalidate alerts to refresh them
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/alerts'] });
    },
    onError: (error) => {
      console.error('Error registering token:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to enable notifications. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Fetch critical alerts with proper error handling
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useQuery({
    queryKey: ['/api/notifications/alerts'],
    refetchInterval: 30000, // Check every 30 seconds
    select: (data: any) => data?.alerts || [],
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Request notification permission and register token  
  const enableNotifications = async () => {
    try {
      // Step 1: Request permission
      const hasPermission = await notificationService.requestPermission();
      setPermissionGranted(hasPermission);
      
      if (!hasPermission) {
        toast({
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings to receive alerts.',
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Get FCM token
      const token = await notificationService.getFCMToken();
      if (!token) {
        toast({
          title: 'Error',
          description: 'Failed to get notification token. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setFcmToken(token);

      // Step 3: Register token immediately (don't use state)
      const deviceInfo = navigator.userAgent;
      registerTokenMutation.mutate({ token, deviceInfo });

      // Step 4: Set up foreground message listener
      notificationService.setupForegroundMessageListener((payload) => {
        toast({
          title: payload.notification?.title || 'Alert',
          description: payload.notification?.body || 'You have a new notification',
          variant: payload.data?.severity === 'critical' ? 'destructive' : 'default',
        });
      });

    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Disable notifications
  const disableNotifications = async () => {
    if (fcmToken) {
      try {
        await fetch(`/api/notifications/token/${encodeURIComponent(fcmToken)}`, {
          method: 'DELETE',
        });
        
        setPermissionGranted(false);
        setFcmToken(null);
        
        toast({
          title: 'Notifications disabled',
          description: 'You will no longer receive push notifications.',
        });
      } catch (error) {
        console.error('Error disabling notifications:', error);
        toast({
          title: 'Error',
          description: 'Failed to disable notifications.',
          variant: 'destructive',
        });
      }
    }
  };

  return {
    permissionGranted,
    fcmToken,
    alerts: alerts || [],
    alertsLoading,
    alertsError,
    enableNotifications,
    disableNotifications,
    registeringToken: registerTokenMutation.isPending,
  };
}