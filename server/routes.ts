import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ref, set, get, child, update } from "firebase/database";
import { database } from "../client/src/lib/firebase";

interface SensorData {
  deviceId: string;
  waterLevel: number;
  binFullness: number;
  binWeight: number;
  timestamp: string;
}

// Save formatted date for history tracking
function getFormattedDate() {
  const date = new Date();
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Save formatted time for history tracking
function getFormattedTime() {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}_${minutes}_${seconds}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check API endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // User authentication status endpoint
  app.get("/api/auth/status", (req, res) => {
    res.json({ isAuthenticated: req.session && req.session.user ? true : false });
  });

  // Endpoint for sensor data submission
  app.post("/api/sensor-data", async (req: Request, res: Response) => {
    try {
      const sensorData: SensorData = req.body;
      
      if (!sensorData.deviceId) {
        return res.status(400).json({ error: "Device ID is required" });
      }

      // Find users who have this device ID registered
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "No users found" });
      }

      const usersData = snapshot.val();
      let deviceFound = false;
      
      // For each user, check if they have the device registered
      for (const userId in usersData) {
        const userDevicesRef = ref(database, `users/${userId}/devices`);
        const userDevicesSnapshot = await get(userDevicesRef);
        
        if (userDevicesSnapshot.exists()) {
          const devices = userDevicesSnapshot.val();
          
          for (const deviceKey in devices) {
            if (devices[deviceKey].id === sensorData.deviceId) {
              deviceFound = true;
              
              // Update the user's water level data
              await update(ref(database, `users/${userId}/waterLevels/${sensorData.deviceId}`), {
                id: sensorData.deviceId,
                level: sensorData.waterLevel,
                lastUpdated: new Date().toISOString(),
                location: devices[deviceKey].location || "Unknown"
              });
              
              // Update the user's waste bin data
              await update(ref(database, `users/${userId}/wasteBins/${sensorData.deviceId}`), {
                id: sensorData.deviceId,
                fullness: sensorData.binFullness,
                weight: sensorData.binWeight,
                lastEmptied: new Date().toISOString(),
                location: devices[deviceKey].location || "Unknown"
              });

              // Save to history for water level
              const dateStr = getFormattedDate();
              const timeStr = getFormattedTime();
              
              await set(
                ref(database, `users/${userId}/waterLevelHistory/${dateStr}/${sensorData.deviceId}/${timeStr}`),
                {
                  timestamp: new Date().toISOString(),
                  level: sensorData.waterLevel
                }
              );
              
              // Save to history for waste bin
              await set(
                ref(database, `users/${userId}/wasteBinHistory/${dateStr}/${sensorData.deviceId}/${timeStr}`),
                {
                  timestamp: new Date().toISOString(),
                  fullness: sensorData.binFullness,
                  weight: sensorData.binWeight
                }
              );
              
              // Get device thresholds to send back to the Arduino
              const thresholds = devices[deviceKey].thresholds || {
                waterLevel: 80,
                binFullness: 80,
                wasteWeight: 80
              };
              
              // Get notification contacts for this device
              const notifications = devices[deviceKey].notifications || {
                enabled: false,
                notifyOnWaterLevel: true,
                notifyOnBinFullness: true,
                notifyOnWeight: true,
                notifyContacts: []
              };
              
              // Return the device configuration
              return res.status(200).json({
                success: true,
                thresholds,
                notifications
              });
            }
          }
        }
      }
      
      if (!deviceFound) {
        return res.status(404).json({ error: "Device not registered to any user" });
      }
      
    } catch (error) {
      console.error("Error processing sensor data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
