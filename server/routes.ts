import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFcmTokenSchema } from "@shared/schema";
import { log } from "./vite";

// Define session user interface
interface SessionUser {
  id: number;
  username: string;
  email: string;
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
  app.post("/api/auth/verify", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: "Firebase ID token is required" });
      }

      // In a real implementation, you would use firebase-admin to verify the token.
      // For this demo, we'll parse the token without verification.
      try {
        const parts = idToken.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT format');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const email = payload.email;
        const uid = payload.sub;
        
        if (!email) {
          return res.status(400).json({ error: "Invalid ID token - no email found" });
        }

        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.createUser({
            username: email.split('@')[0],
            password: "firebase-auth",
            email: email,
            firebaseUid: uid,
            createdAt: new Date().toISOString()
          });
        }

        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email
        };

        res.json({ 
          success: true, 
          user: req.session.user
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
  app.get("/api/auth/status", (req: AuthenticatedRequest, res) => {
    if (req.session && req.session.user) {
      res.json({ 
        isAuthenticated: true, 
        user: req.session.user 
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}