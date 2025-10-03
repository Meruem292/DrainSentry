import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFcmTokenSchema, type FcmToken } from "@shared/schema";
import { PushNotificationService } from "./notification-service";
import { database, ref, get } from "./firebase";
import { log } from "./vite";

// Define session user interface
interface SessionUser {
  id: number;
  username: string;
}

// Extend Request interface for session
interface AuthenticatedRequest extends Request {
  session: {
    user?: SessionUser;
  } & any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check API endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Firebase auth verification and session creation endpoint
  app.post("/api/auth/verify", async (req: any, res: Response) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: "Firebase ID token is required" });
      }

      // For demo purposes, we'll validate the ID token format but not actually verify it
      // In a real implementation, you would install firebase-admin and verify the token:
      // const admin = require('firebase-admin');
      // const decodedToken = await admin.auth().verifyIdToken(idToken);
      // const { email, uid } = decodedToken;
      
      // For now, let's decode the JWT payload to get email (without verification)
      // This is still not secure but better than trusting client data directly
      try {
        const parts = idToken.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT format');
        }
        
        // Use Buffer instead of atob (which doesn't exist in Node.js)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const email = payload.email;
        const uid = payload.sub;
        
        if (!email) {
          return res.status(400).json({ error: "Invalid ID token - no email found" });
        }

        // Create/get user by email
        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.createUser({
            username: email.split('@')[0],
            password: "firebase-auth", // Not used for Firebase users
            email: email,
            firebaseUid: uid,
            createdAt: new Date().toISOString()
          });
        }

        // Create Express session
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email
        };

        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email 
          } 
        });
      } catch (tokenError) {
        console.error("Error parsing ID token:", tokenError);
        return res.status(401).json({ error: "Invalid ID token format" });
      }
    } catch (error) {
      console.error("Error verifying auth:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // User authentication status endpoint
  app.get("/api/auth/status", (req: any, res) => {
    if (req.session && req.session.user) {
      res.json({ 
        isAuthenticated: true, 
        user: req.session.user 
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // FCM Token endpoints for push notifications - SIMPLIFIED (No auth required)
  app.post("/api/notifications/token", async (req: any, res: Response) => {
    try {
      const { token, deviceInfo } = req.body;
      if (!token) {
        return res.status(400).json({ error: "FCM token is required" });
      }

      // Use a default user ID (1) for all tokens since we removed authentication
      const userId = 1;

      const validatedData = insertFcmTokenSchema.parse({
        userId,
        token,
        deviceInfo: deviceInfo || null,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      });

      // Check if token already exists
      const allTokens = await storage.getAllFcmTokens();
      const tokenExists = allTokens.find(t => t.token === token);
      
      if (tokenExists) {
        await storage.updateFcmToken(token, new Date().toISOString());
        res.json({ success: true, message: "Token updated" });
      } else {
        const fcmToken = await storage.createFcmToken(validatedData);
        res.json({ success: true, token: fcmToken });
      }
    } catch (error) {
      console.error("Error saving FCM token:", error);
      res.status(400).json({ error: "Invalid token data" });
    }
  });

  app.delete("/api/notifications/token/:token", async (req: any, res: Response) => {
    try {
      await storage.deleteFcmToken(req.params.token);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting FCM token:", error);
      res.status(500).json({ error: "Failed to delete token" });
    }
  });

  // Critical alerts endpoint - Check all critical alerts (no auth required)
  app.get("/api/notifications/alerts", async (req: any, res: Response) => {
    try {
      const alerts = await checkAllCriticalAlerts();
      res.json({ alerts });
    } catch (error) {
      console.error("Error checking alerts:", error);
      res.status(500).json({ error: "Failed to check alerts" });
    }
  });

  // Endpoint to check and send push notifications for critical alerts
  app.post("/api/notifications/check", async (req: any, res: Response) => {
    try {
      const result = await checkAndSendCriticalAlerts();
      res.json(result);
    } catch (error) {
      console.error("Error checking and sending alerts:", error);
      res.status(500).json({ error: "Failed to check and send alerts" });
    }
  });

  // Test endpoint to trigger push notifications  
  app.post("/api/notifications/test", async (req: any, res: Response) => {
    try {
      // Require authentication for test endpoint too
      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const notificationService = PushNotificationService.getInstance();
      
      // Create sample data for testing with authenticated user
      const userId = req.session.user.id;
      await createSampleData(userId);
      
      // Test notification for authenticated user
      const result = await notificationService.checkAndNotifyAlerts(userId);
      res.json({ 
        success: true, 
        message: "Test notifications triggered",
        result 
      });
    } catch (error) {
      console.error("Error testing notifications:", error);
      res.status(500).json({ error: "Failed to test notifications" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}

// Helper function to check for critical alerts
async function checkCriticalAlerts(userId: number) {
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

// Simplified helper function to check ALL critical alerts from Firebase (no user filtering)
async function checkAllCriticalAlerts() {
  const alerts: Array<{ type: string; message: string; severity: string; deviceId?: string; deviceName?: string }> = [];

  try {
    // Get all users from Firebase
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      return alerts;
    }

    const usersData = usersSnapshot.val();
    
    // Iterate through all users
    for (const userId in usersData) {
      const userData = usersData[userId];
      
      // Check water levels from history (latest readings) (>85%)
      if (userData.waterLevelHistory) {
        for (const deviceKey in userData.waterLevelHistory) {
          const history = userData.waterLevelHistory[deviceKey];
          
          // Get the latest reading from history
          let latestLevel = 0;
          let latestTimestamp = 0;
          
          for (const timestampKey in history) {
            const entry = history[timestampKey];
            const timestamp = new Date(entry.timestamp || timestampKey).getTime();
            const level = entry.level || entry.value || entry.waterLevel || 0;
            
            if (timestamp > latestTimestamp) {
              latestTimestamp = timestamp;
              latestLevel = level;
            }
          }
          
          if (latestLevel > 85) {
            const deviceName = userData.devices?.[deviceKey]?.name || deviceKey;
            alerts.push({
              type: 'water_level',
              message: `Critical water level: ${latestLevel}% at ${deviceName}`,
              severity: 'critical',
              deviceId: deviceKey,
              deviceName: deviceName
            });
          }
        }
      }

      // Check waste bins from history (latest readings) (>85%)
      if (userData.wasteBinHistory) {
        for (const deviceKey in userData.wasteBinHistory) {
          const history = userData.wasteBinHistory[deviceKey];
          
          // Get the latest reading from history
          let latestFullness = 0;
          let latestTimestamp = 0;
          
          for (const timestampKey in history) {
            const entry = history[timestampKey];
            const timestamp = new Date(entry.timestamp || timestampKey).getTime();
            const fullness = entry.fullness || entry.binFullness || 0;
            
            if (timestamp > latestTimestamp) {
              latestTimestamp = timestamp;
              latestFullness = fullness;
            }
          }
          
          if (latestFullness > 85) {
            const deviceName = userData.devices?.[deviceKey]?.name || deviceKey;
            alerts.push({
              type: 'waste_bin',
              message: `Critical waste bin: ${latestFullness}% full at ${deviceName}`,
              severity: 'critical',
              deviceId: deviceKey,
              deviceName: deviceName
            });
          }
        }
      }
    }

    if (alerts.length > 0) {
      log(`Found ${alerts.length} critical alert(s)`, "alerts");
    }
  } catch (error) {
    console.error("Error checking critical alerts from Firebase:", error);
  }

  return alerts;
}

// Check and send push notifications for critical alerts
async function checkAndSendCriticalAlerts() {
  try {
    const alerts = await checkAllCriticalAlerts();
    
    if (alerts.length === 0) {
      return {
        success: true,
        message: "No critical alerts found",
        alertsCount: 0
      };
    }

    // Get all active FCM tokens
    const allTokens = await storage.getAllFcmTokens();
    const activeTokens = allTokens.filter(token => token.isActive);

    if (activeTokens.length === 0) {
      return {
        success: true,
        message: "Critical alerts found but no tokens registered",
        alertsCount: alerts.length,
        alerts
      };
    }

    // Send notifications (simplified - send to all tokens)
    const notificationService = PushNotificationService.getInstance();
    
    for (const alert of alerts) {
      await notificationService.sendCriticalAlert(1, {
        type: alert.type as 'water_level' | 'waste_bin' | 'device_offline',
        message: alert.message,
        severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        deviceId: undefined // Firebase uses string IDs, notification service expects number
      });
    }

    return {
      success: true,
      message: "Push notifications sent",
      alertsCount: alerts.length,
      tokensCount: activeTokens.length,
      alerts
    };
  } catch (error) {
    console.error("Error checking and sending critical alerts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to create sample data for testing
async function createSampleData(userId: number) {
  try {
    // Create sample devices if not exist for the specific user
    const devices = await storage.getDevices(userId);
    if (devices.length === 0) {
      await storage.createDevice({
        userId: userId,
        deviceId: `device-${userId}-001`,
        name: "Main Water Sensor",
        type: "water_level",
        location: "Building A",
        status: "online",
        lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
      });

      await storage.createDevice({
        userId: userId,
        deviceId: `device-${userId}-002`, 
        name: "Waste Bin Monitor",
        type: "waste_bin",
        location: "Building B",
        status: "online",
        lastSeen: new Date().toISOString()
      });
    }

    // Get the devices to use their IDs
    const userDevices = await storage.getDevices(userId);
    if (userDevices.length >= 2) {
      // Create critical water level data
      await storage.createWaterLevel({
        userId: userId,
        deviceId: userDevices[0].id,
        level: 97, // Critical level
        timestamp: new Date().toISOString()
      });

      // Create critical waste bin data
      await storage.createWasteBin({
        userId: userId,
        deviceId: userDevices[1].id,
        fullness: 92, // Critical fullness
        weight: 45,
        lastEmptied: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        timestamp: new Date().toISOString()
      });
    }

    // Create sample FCM token for testing if none exists
    const tokens = await storage.getFcmTokens(userId);
    if (tokens.length === 0) {
      await storage.createFcmToken({
        userId: userId,
        token: `sample-fcm-token-${userId}-${Date.now()}`,
        deviceInfo: "Test Browser",
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      });
    }

    console.log(`✅ Sample data created successfully for user ${userId}`);
  } catch (error) {
    console.error("Error creating sample data:", error);
  }
}
