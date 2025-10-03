import { admin, isFirebaseInitialized } from "./firebase";

export class PushNotificationService {
  private static instance: PushNotificationService;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async sendNotificationToUser(userId: string, alert: {
    type: "water_level" | "waste_bin";
    message: string;
    severity: "critical";
    deviceId?: string;
  }) {
    // Create notification payload
    const notification = {
      title: this.getNotificationTitle(alert.type, alert.severity),
      body: alert.message,
    };

    // If Firebase is not initialized, simulate the notification
    if (!isFirebaseInitialized) {
      console.log("======================================================");
      console.log("SIMULATING PUSH NOTIFICATION (Firebase not initialized)");
      console.log(`User ID: ${userId}`);
      console.log(`Title: ${notification.title}`);
      console.log(`Body: ${notification.body}`);
      console.log(`Device ID: ${alert.deviceId}`);
      console.log("======================================================");
      return {
        success: true,
        tokensCount: 0,
        notification,
        simulated: true,
      };
    }

    try {
      // Get user-specific FCM tokens
      const tokensRef = admin.database().ref(`users/${userId}/fcm_tokens`);
      const snapshot = await tokensRef.once("value");
      const tokensData = snapshot.val();

      if (!tokensData) {
        console.log(`No FCM tokens found for user ${userId}.`);
        return;
      }

      const tokens = Object.keys(tokensData);

      if (tokens.length === 0) {
        console.log(`No active FCM tokens found for user ${userId}.`);
        return;
      }

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
          if (error.code === 'messaging/registration-token-not-registered') {
            await admin.database().ref(`users/${userId}/fcm_tokens/${token}`).remove();
            console.log(`Removed invalid token for user ${userId}: ${token.substring(0, 10)}...`);
          }
        }
      });

      await Promise.all(sendPromises);

      console.log('🔔 PUSH NOTIFICATIONS SENT:');
      console.log(`👤 User ID: ${userId}`);
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