import { storage } from "./storage";

// Note: In a real implementation, you would use Firebase Admin SDK
// For this demo, we'll simulate the notification sending
export class PushNotificationService {
  private static instance: PushNotificationService;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async sendCriticalAlert(userId: number, alert: {
    type: 'water_level' | 'waste_bin' | 'device_offline';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    deviceId?: number;
  }) {
    try {
      // Get user's FCM tokens
      const tokens = await storage.getFcmTokens(userId);
      const activeTokens = tokens.filter(token => token.isActive);

      if (activeTokens.length === 0) {
        console.log(`No active FCM tokens found for user ${userId}`);
        return;
      }

      // Create notification payload
      const notification = {
        title: this.getNotificationTitle(alert.type, alert.severity),
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.type,
        data: {
          type: alert.type,
          severity: alert.severity,
          deviceId: alert.deviceId?.toString(),
          url: this.getNotificationUrl(alert.type, alert.deviceId),
          timestamp: new Date().toISOString()
        }
      };

      // In a real implementation, you would use Firebase Admin SDK here:
      // const admin = require('firebase-admin');
      // const messaging = admin.messaging();
      // 
      // for (const token of activeTokens) {
      //   try {
      //     await messaging.send({
      //       token: token.token,
      //       notification: notification.title && notification.body ? {
      //         title: notification.title,
      //         body: notification.body,
      //       } : undefined,
      //       data: notification.data,
      //       webpush: {
      //         notification: {
      //           title: notification.title,
      //           body: notification.body,
      //           icon: notification.icon,
      //           badge: notification.badge,
      //           tag: notification.tag,
      //           data: notification.data
      //         }
      //       }
      //     });
      //     
      //     // Update last used timestamp
      //     await storage.updateFcmToken(token.token, new Date().toISOString());
      //     console.log(`Push notification sent to token: ${token.token.substring(0, 10)}...`);
      //   } catch (error) {
      //     console.error(`Failed to send to token ${token.token.substring(0, 10)}...:`, error);
      //     
      //     // If token is invalid, mark as inactive
      //     if (error.code === 'messaging/registration-token-not-registered') {
      //       await storage.deleteFcmToken(token.token);
      //     }
      //   }
      // }

      // For demo purposes, just log the notification
      console.log('🔔 PUSH NOTIFICATION SENT:');
      console.log(`👤 User ID: ${userId}`);
      console.log(`📱 Tokens: ${activeTokens.length} active`);
      console.log(`🚨 Type: ${alert.type} (${alert.severity})`);
      console.log(`💬 Message: ${alert.message}`);
      console.log(`📄 Payload:`, JSON.stringify(notification, null, 2));

      return {
        success: true,
        tokensCount: activeTokens.length,
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

  private getNotificationUrl(type: string, deviceId?: number): string {
    switch (type) {
      case 'water_level':
        return deviceId ? `/water-levels/${deviceId}` : '/water-levels';
      case 'waste_bin':
        return '/waste-bins';
      case 'device_offline':
        return deviceId ? `/devices` : '/devices';
      default:
        return '/';
    }
  }

  // Monitor and send notifications for critical alerts
  async checkAndNotifyAlerts(userId: number) {
    try {
      // Get critical alerts
      const alerts = await this.getCriticalAlerts(userId);
      
      // Send notifications for critical and high severity alerts
      const alertsToNotify = alerts.filter(alert => 
        alert.severity === 'critical' || alert.severity === 'high'
      );

      for (const alert of alertsToNotify) {
        await this.sendCriticalAlert(userId, {
          type: alert.type as 'water_level' | 'waste_bin' | 'device_offline',
          message: alert.message,
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
          deviceId: alert.deviceId
        });
      }

      return {
        totalAlerts: alerts.length,
        notifiedAlerts: alertsToNotify.length,
        alerts: alertsToNotify
      };

    } catch (error) {
      console.error('Error checking and notifying alerts:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async getCriticalAlerts(userId: number) {
    const alerts: Array<{ type: string; message: string; severity: string; deviceId?: number }> = [];

    try {
      // Check water levels for high readings
      const waterLevels = await storage.getWaterLevels(userId);
      const devices = await storage.getDevices(userId);
      
      for (const level of waterLevels) {
        if (level.level > 80) { // High water level threshold
          const device = devices.find(d => d.id === level.deviceId);
          alerts.push({
            type: 'water_level',
            message: `High water level detected: ${level.level}% at ${device?.name || 'Unknown Device'}`,
            severity: level.level > 95 ? 'critical' : 'high',
            deviceId: level.deviceId
          });
        }
      }

      // Check waste bins for fullness
      const wasteBins = await storage.getWasteBins(userId);
      for (const bin of wasteBins) {
        if (bin.fullness > 85) { // Full waste bin threshold
          const device = devices.find(d => d.id === bin.deviceId);
          alerts.push({
            type: 'waste_bin',
            message: `Waste bin is ${bin.fullness}% full at ${device?.name || 'Unknown Device'}`,
            severity: bin.fullness > 95 ? 'critical' : 'high',
            deviceId: bin.deviceId
          });
        }
      }

      // Check for offline devices
      const now = new Date();
      for (const device of devices) {
        if (device.lastSeen) {
          const lastSeen = new Date(device.lastSeen);
          const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceLastSeen > 2) { // Device offline for more than 2 hours
            alerts.push({
              type: 'device_offline',
              message: `Device ${device.name} has been offline for ${Math.round(hoursSinceLastSeen)} hours`,
              severity: hoursSinceLastSeen > 24 ? 'critical' : 'medium',
              deviceId: device.id
            });
          }
        }
      }

    } catch (error) {
      console.error("Error checking critical alerts:", error);
    }

    return alerts;
  }
}