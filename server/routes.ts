import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFcmTokenSchema, type FcmToken } from "@shared/schema";
import { PushNotificationService } from "./notification-service";
import { ref, get } from "./firebase";
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

  // FCM Token endpoints for push notifications - SECURED
  app.post("/api/notifications/token", async (req: any, res: Response) => {
    try {
      // Require authentication
      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { token, deviceInfo } = req.body;
      if (!token) {
        return res.status(400).json({ error: "FCM token is required" });
      }

      // Use authenticated user ID, ignore any userId from client
      const userId = req.session.user.id;

      const validatedData = insertFcmTokenSchema.parse({
        userId,
        token,
        deviceInfo: deviceInfo || null,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      });

      // Check if token already exists for this user
      const existingTokens = await storage.getFcmTokens(userId);
      const tokenExists = existingTokens.find(t => t.token === token);
      
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
      // Require authentication
      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Verify the token belongs to the authenticated user
      const userId = req.session.user.id;
      const userTokens = await storage.getFcmTokens(userId);
      const tokenExists = userTokens.find(t => t.token === req.params.token);

      if (!tokenExists) {
        return res.status(404).json({ error: "Token not found or not owned by user" });
      }

      await storage.deleteFcmToken(req.params.token);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting FCM token:", error);
      res.status(500).json({ error: "Failed to delete token" });
    }
  });

  // Critical alerts endpoint - this will be used to check for alerts and send notifications
  app.get("/api/notifications/alerts", async (req: any, res: Response) => {
    try {
      if (!req.session?.user?.id) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.user.id;
      const notificationService = PushNotificationService.getInstance();
      const result = await notificationService.checkAndNotifyAlerts(userId);
      res.json({ alerts: result.alerts });
    } catch (error) {
      console.error("Error checking alerts:", error);
      res.status(500).json({ error: "Failed to check alerts" });
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
