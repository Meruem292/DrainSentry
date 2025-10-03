import { admin } from "./firebase";

export class PushNotificationService {
  private static instance: PushNotificationService;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async sendNotificationToAll(alert: {
    type: "water_level" | "waste_bin";
    message: string;
    severity: "critical";
    deviceId?: string;
  }) {
    try {
      // Get all FCM tokens from the public collection
      const tokensRef = admin.database().ref("fcm_tokens");
      const snapshot = await tokensRef.once("value");
      const tokensData = snapshot.val();

      if (!tokensData) {
        console.log("No FCM tokens found in the database.");
        return;
      }

      const tokens = Object.keys(tokensData);

      if (tokens.length === 0) {
        console.log("No active FCM tokens found.");
        return;
      }

      // Create notification payload
      const notification = {
        title: this.getNotificationTitle(alert.type, alert.severity),
        body: alert.message,
      };

      const dataPayload = {
        type: alert.type,
        severity: alert.severity,
        deviceId: alert.deviceId?.toString() || "",
        url: this.getNotificationUrl(alert.type, alert.deviceId),
        timestamp: new Date().toISOString(),
      };

      const messaging = admin.messaging();

      const sendPromises = tokens.map(async (token) => {
        try {
          await messaging.send({
            token: token,
            notification,
            data: dataPayload,
            webpush: {
              notification: {
                ...notification,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: alert.type,
              },
            },
          });
        } catch (error: any) {
          console.error(`Failed to send to token ${token.substring(0, 10)}...:`, error);
          // If token is invalid, remove it from the database
          if (error.code === 'messaging/registration-token-not-registered') {
            await admin.database().ref(`fcm_tokens/${token}`).remove();
            console.log(`Removed invalid token: ${token.substring(0, 10)}...`);
          }
        }
      });

      await Promise.all(sendPromises);

      console.log('🔔 PUSH NOTIFICATIONS SENT:');
      console.log(`📱 Tokens: ${tokens.length}`);
      console.log(`🚨 Type: ${alert.type} (${alert.severity})`);
      console.log(`💬 Message: ${alert.message}`);

      return {
        success: true,
        tokensCount: tokens.length,
        notification
      };

    } catch (error) {
      console.error('Error sending push notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getNotificationTitle(type: string, severity: string): string {
    const severityEmoji: Record<string, string> = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    };

    const typeMessages: Record<string, string> = {
      water_level: 'Water Level Alert',
      waste_bin: 'Waste Bin Alert',
      device_offline: 'Device Offline'
    };

    return `${severityEmoji[severity] || '🔔'} ${typeMessages[type] || 'Alert'}`;
  }

  private getNotificationUrl(type: string, deviceId?: string): string {
    switch (type) {
      case 'water_level':
        return deviceId ? `/water-levels/${deviceId}` : '/water-levels';
      case 'waste_bin':
        return deviceId ? `/waste-bins/${deviceId}` : '/waste-bins';
      default:
        return '/';
    }
  }
}