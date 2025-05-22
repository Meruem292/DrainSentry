import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { database } from "../lib/firebase";
import { useAuth } from "./useAuth";

// Define history entry types
export interface WaterLevelHistoryEntry {
  timestamp: string;
  level: number;
}

export interface WasteBinHistoryEntry {
  timestamp: string;
  fullness: number;
  weight: number;
}

// Hook to fetch real water level history for a device
export function useWaterLevelHistory(deviceId: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WaterLevelHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !deviceId) {
      setLoading(false);
      return;
    }
    
    console.log("Fetching water level history for device:", deviceId);
    
    const fetchHistoryData = async () => {
      try {
        // Using direct approach with device ID
        // Get the current date for Firebase path
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Get waterLevelHistory for the current date
        const historyRef = ref(database, `users/${user.uid}/waterLevelHistory/${dateStr}`);
        const historySnapshot = await get(historyRef);
        
        if (!historySnapshot.exists()) {
          console.log("No history data found for date:", dateStr);
          setLoading(false);
          return;
        }
        
        const historyData = historySnapshot.val();
        const historyEntries: WaterLevelHistoryEntry[] = [];
        
        // Iterate through all devices in the history data
        Object.entries(historyData).forEach(([deviceKey, deviceData]: [string, any]) => {
          // Check if this device has our device ID
          // Just scan all device entries since we don't know the device key
          
          if (deviceData && typeof deviceData === 'object') {
            Object.entries(deviceData).forEach(([timeKey, timeData]: [string, any]) => {
              if (typeof timeData === 'object' && 'value' in timeData) {
                // Format timestamp from HH_MM_SS to ISO
                const hour = timeKey.split('_')[0];
                const minute = timeKey.split('_')[1];
                const second = timeKey.split('_')[2];
                const timestamp = `${dateStr}T${hour}:${minute}:${second}`;
                
                historyEntries.push({
                  timestamp: timestamp,
                  level: timeData.value
                });
              }
            });
          }
        });
        
        // Sort by timestamp
        historyEntries.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log("Fetched history entries:", historyEntries.length);
        setHistory(historyEntries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching water level history:", error);
        setLoading(false);
      }
    };
    
    fetchHistoryData();
  }, [user, deviceId]);
  
  return { history, loading };
}

// Hook to fetch real waste bin history for a device
export function useWasteBinHistory(deviceId: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WasteBinHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !deviceId) {
      setLoading(false);
      return;
    }
    
    console.log("Fetching waste bin history for device:", deviceId);
    
    const fetchHistoryData = async () => {
      try {
        // Using direct approach with device ID
        // Get the current date for Firebase path
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Get wasteBinHistory for the current date
        const historyRef = ref(database, `users/${user.uid}/wasteBinHistory/${dateStr}`);
        const historySnapshot = await get(historyRef);
        
        if (!historySnapshot.exists()) {
          console.log("No waste bin history found for date:", dateStr);
          setLoading(false);
          return;
        }
        
        const historyData = historySnapshot.val();
        const historyEntries: WasteBinHistoryEntry[] = [];
        
        // Iterate through all devices in the history data
        Object.entries(historyData).forEach(([deviceKey, deviceData]: [string, any]) => {
          // Process all entries in this device's data
          if (deviceData && typeof deviceData === 'object') {
            Object.entries(deviceData).forEach(([timeKey, timeData]: [string, any]) => {
              if (typeof timeData === 'object' && (timeData.fullness !== undefined || timeData.weight !== undefined)) {
                // Format timestamp from HH_MM_SS to readable format
                const hour = timeKey.split('_')[0];
                const minute = timeKey.split('_')[1];
                const second = timeKey.split('_')[2];
                const timestamp = `${dateStr}T${hour}:${minute}:${second}`;
                
                historyEntries.push({
                  timestamp: timestamp,
                  fullness: timeData.fullness || 0,
                  weight: timeData.weight || 0
                });
              }
            });
          }
        });
        
        // Sort by timestamp
        historyEntries.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log("Fetched waste bin history entries:", historyEntries.length);
        setHistory(historyEntries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching waste bin history:", error);
        setLoading(false);
      }
    };
    
    fetchHistoryData();
  }, [user, deviceId]);

  return { history, loading };
}