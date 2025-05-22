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

    // Find the device container key first
    const findDeviceAndFetchHistory = async () => {
      try {
        // Get the devices list
        const devicesRef = ref(database, `users/${user.uid}/devices`);
        const devicesSnapshot = await get(devicesRef);
        
        if (!devicesSnapshot.exists()) {
          setLoading(false);
          return;
        }
        
        // Find the container key for this device ID
        const devicesData = devicesSnapshot.val();
        let containerKey = null;
        
        Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
          if (value.id === deviceId) {
            containerKey = key;
          }
        });
        
        if (!containerKey) {
          setLoading(false);
          return;
        }
        
        // Now fetch history data for this device
        const historyEntries: WaterLevelHistoryEntry[] = [];
        
        // Get data for the last 30 days
        const today = new Date();
        const promises = [];
        
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          // Prepare the request for this date
          const historyRef = ref(database, `users/${user.uid}/waterLevelHistory/${dateStr}/${containerKey}`);
          promises.push(
            get(historyRef).then(snapshot => {
              if (snapshot.exists()) {
                const dateData = snapshot.val();
                
                // Handle different data formats
                if (typeof dateData === 'number') {
                  // Old format - single number value
                  historyEntries.push({
                    timestamp: `${dateStr}T12:00:00Z`, // Use noon as default time
                    level: dateData
                  });
                } 
                else if (typeof dateData === 'object') {
                  // Newer format - could be one entry or multiple timestamped entries
                  if (dateData.value !== undefined) {
                    // Single entry with value field
                    historyEntries.push({
                      timestamp: `${dateStr}T12:00:00Z`,
                      level: dateData.value
                    });
                  }
                  else {
                    // Multiple entries with timestamps as keys
                    Object.entries(dateData).forEach(([timeKey, timeData]: [string, any]) => {
                      if (typeof timeData === 'object' && timeData.value !== undefined) {
                        // Convert HH_MM_SS to HH:MM:SS format
                        const timeStr = timeKey.replace(/_/g, ':');
                        historyEntries.push({
                          timestamp: `${dateStr}T${timeStr}Z`,
                          level: timeData.value
                        });
                      }
                    });
                  }
                }
              }
            }).catch(error => {
              console.error(`Error fetching history for ${dateStr}:`, error);
            })
          );
        }
        
        // Wait for all history data to be fetched
        await Promise.all(promises);
        
        // Sort by timestamp and update state
        historyEntries.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setHistory(historyEntries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching water level history:", error);
        setLoading(false);
      }
    };
    
    findDeviceAndFetchHistory();
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

    // Find the device container key first
    const findDeviceAndFetchHistory = async () => {
      try {
        // Get the devices list
        const devicesRef = ref(database, `users/${user.uid}/devices`);
        const devicesSnapshot = await get(devicesRef);
        
        if (!devicesSnapshot.exists()) {
          setLoading(false);
          return;
        }
        
        // Find the container key for this device ID
        const devicesData = devicesSnapshot.val();
        let containerKey = null;
        
        Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
          if (value.id === deviceId) {
            containerKey = key;
          }
        });
        
        if (!containerKey) {
          setLoading(false);
          return;
        }
        
        // Now fetch history data for this device
        const historyEntries: WasteBinHistoryEntry[] = [];
        
        // Get data for the last 30 days
        const today = new Date();
        const promises = [];
        
        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          // Prepare the request for this date
          const historyRef = ref(database, `users/${user.uid}/wasteBinHistory/${dateStr}/${containerKey}`);
          promises.push(
            get(historyRef).then(snapshot => {
              if (snapshot.exists()) {
                const dateData = snapshot.val();
                
                // Handle different data formats
                if (typeof dateData === 'object') {
                  // Check if it's the single object format (old format)
                  if (dateData.fullness !== undefined || dateData.weight !== undefined) {
                    historyEntries.push({
                      timestamp: `${dateStr}T12:00:00Z`, // Use noon as default time
                      fullness: dateData.fullness || 0,
                      weight: dateData.weight || 0
                    });
                  }
                  else {
                    // Multiple entries with timestamps as keys (new format)
                    Object.entries(dateData).forEach(([timeKey, timeData]: [string, any]) => {
                      if (typeof timeData === 'object') {
                        // Convert HH_MM_SS to HH:MM:SS format
                        const timeStr = timeKey.replace(/_/g, ':');
                        historyEntries.push({
                          timestamp: `${dateStr}T${timeStr}Z`,
                          fullness: timeData.fullness || 0,
                          weight: timeData.weight || 0
                        });
                      }
                    });
                  }
                }
              }
            }).catch(error => {
              console.error(`Error fetching history for ${dateStr}:`, error);
            })
          );
        }
        
        // Wait for all history data to be fetched
        await Promise.all(promises);
        
        // Sort by timestamp and update state
        historyEntries.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setHistory(historyEntries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching waste bin history:", error);
        setLoading(false);
      }
    };
    
    findDeviceAndFetchHistory();
  }, [user, deviceId]);

  return { history, loading };
}