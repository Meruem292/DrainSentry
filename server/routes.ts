import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check API endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // User authentication status endpoint
  app.get("/api/auth/status", (req, res) => {
    res.json({ isAuthenticated: req.session && req.session.user ? true : false });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
