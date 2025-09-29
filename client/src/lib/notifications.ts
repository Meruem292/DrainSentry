import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

export interface NotificationData {
  type: 'water_level' | 'waste_bin' | 'device_offline';
  deviceId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  url?: string;
}

// Vapid key for push notifications - you'll need to get this from Firebase Console
const VAPID_KEY = "BKqKz8ZQhHllbS8C9VZQKf8JXoNDJ6O_Y0FQ8fD2HxYJJxX_aKqKz8ZQhHllbS8C9VZQKf8JXoNDJ6O_Y0FQ8fD2HxY";

export class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async getFCMToken(): Promise<string | null> {
    if (!messaging) {
      console.warn('Firebase messaging not available');
      return null;
    }

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('Notification permission denied');
        return null;
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        this.fcmToken = token;
        console.log('FCM Token:', token);
        return token;
      } else {
        console.warn('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  setupForegroundMessageListener(callback: (payload: any) => void) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
      
      // Show notification if page is not in focus
      if (document.hidden) {
        this.showLocalNotification(payload);
      }
    });
  }

  private showLocalNotification(payload: any) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(
        payload.notification?.title || 'DrainSentry Alert',
        {
          body: payload.notification?.body || 'Critical alert detected',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: payload.data?.type || 'general',
          data: payload.data
        }
      );

      notification.onclick = () => {
        window.focus();
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        }
        notification.close();
      };
    }
  }

  getStoredToken(): string | null {
    return this.fcmToken;
  }

  async updateTokenOnServer(token: string, userId: number): Promise<void> {
    try {
      const response = await fetch('/api/notifications/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update token on server');
      }
    } catch (error) {
      console.error('Error updating token on server:', error);
    }
  }

  static createCriticalAlert(data: NotificationData): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    const typeMessages = {
      water_level: 'Water level alert',
      waste_bin: 'Waste bin alert',
      device_offline: 'Device offline alert'
    };

    return `${severityEmoji[data.severity]} ${typeMessages[data.type]}: ${data.message}`;
  }
}