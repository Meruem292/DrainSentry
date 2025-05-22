import { useState, useEffect } from "react";
import { ref, get, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "./useAuth";

// Define the history entry interfaces
export interface WaterLevelEntry {
  timestamp: string;
  value: number;
}

export interface WasteBinEntry {
  timestamp: string;
  fullness: number;
  weight: number;
}

// Hook to fetch water level history for a device
export function useWaterLevelHistory(deviceId: string, days: number = 30) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WaterLevelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [containerKey, setContainerKey] = useState<string | null>(null);
  
  // First, find the device container key
  useEffect(() => {
    if (!user || !deviceId) {
      setLoading(false);
      return;
    }

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setLoading(false);
        return;
      }
      
      const devicesData = snapshot.val();
      let foundKey = null;
      
      // Find the container key for this device ID
      Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
        if (value.id === deviceId) {
          foundKey = key;
        }
      });
      
      setContainerKey(foundKey);
      if (!foundKey) {
        setLoading(false);
      }
    }, { onlyOnce: true });
    
    return () => unsubscribe();
  }, [user, deviceId]);
  
  // Then, fetch the history data once we have the container key
  useEffect(() => {
    if (!user || !containerKey) return;
    
    const historyData: WaterLevelEntry[] = [];
    const today = new Date();
    let pendingDays = days;
    
    // Fetch data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const historyRef = ref(database, `users/${user.uid}/waterLevelHistory/${dateStr}/${containerKey}`);
      
      get(historyRef).then((snapshot) => {
        if (snapshot.exists()) {
          const dayData = snapshot.val();
          
          // Handle different data formats
          if (typeof dayData === 'number') {
            // Old format: just a number
            historyData.push({
              timestamp: date.toISOString(),
              value: dayData
            });
          } else if (typeof dayData === 'object') {
            // New format: entries with timestamps
            Object.entries(dayData).forEach(([timeKey, data]: [string, any]) => {
              if (typeof data === 'object' && data.value !== undefined) {
                // Convert timestamp format HH_MM_SS to standard format
                const timeStr = timeKey.replace(/_/g, ':');
                historyData.push({
                  timestamp: `${dateStr}T${timeStr}Z`,
                  value: data.value
                });
              }
            });
          }
        }
        
        pendingDays--;
        if (pendingDays === 0) {
          // Sort by timestamp
          historyData.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setHistory(historyData);
          setLoading(false);
        }
      }).catch((error) => {
        console.error("Error fetching water level history:", error);
        pendingDays--;
        if (pendingDays === 0) {
          setLoading(false);
        }
      });
    }
    
  }, [user, containerKey, days]);
  
  return { history, loading };
}

// Hook to fetch waste bin history for a device
export function useWasteBinHistory(deviceId: string, days: number = 30) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WasteBinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [containerKey, setContainerKey] = useState<string | null>(null);
  
  // First, find the device container key
  useEffect(() => {
    if (!user || !deviceId) {
      setLoading(false);
      return;
    }

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setLoading(false);
        return;
      }
      
      const devicesData = snapshot.val();
      let foundKey = null;
      
      // Find the container key for this device ID
      Object.entries(devicesData).forEach(([key, value]: [string, any]) => {
        if (value.id === deviceId) {
          foundKey = key;
        }
      });
      
      setContainerKey(foundKey);
      if (!foundKey) {
        setLoading(false);
      }
    }, { onlyOnce: true });
    
    return () => unsubscribe();
  }, [user, deviceId]);
  
  // Then, fetch the history data once we have the container key
  useEffect(() => {
    if (!user || !containerKey) return;
    
    const historyData: WasteBinEntry[] = [];
    const today = new Date();
    let pendingDays = days;
    
    // Fetch data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const historyRef = ref(database, `users/${user.uid}/wasteBinHistory/${dateStr}/${containerKey}`);
      
      get(historyRef).then((snapshot) => {
        if (snapshot.exists()) {
          const dayData = snapshot.val();
          
          // Handle different data formats
          if (typeof dayData === 'object') {
            // Check if it's the old format (direct fullness/weight)
            if (dayData.fullness !== undefined || dayData.weight !== undefined) {
              historyData.push({
                timestamp: date.toISOString(),
                fullness: dayData.fullness || 0,
                weight: dayData.weight || 0
              });
            } else {
              // New format: entries with timestamps
              Object.entries(dayData).forEach(([timeKey, data]: [string, any]) => {
                if (typeof data === 'object') {
                  // Convert timestamp format HH_MM_SS to standard format
                  const timeStr = timeKey.replace(/_/g, ':');
                  historyData.push({
                    timestamp: `${dateStr}T${timeStr}Z`,
                    fullness: data.fullness || 0,
                    weight: data.weight || 0
                  });
                }
              });
            }
          }
        }
        
        pendingDays--;
        if (pendingDays === 0) {
          // Sort by timestamp
          historyData.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setHistory(historyData);
          setLoading(false);
        }
      }).catch((error) => {
        console.error("Error fetching waste bin history:", error);
        pendingDays--;
        if (pendingDays === 0) {
          setLoading(false);
        }
      });
    }
    
  }, [user, containerKey, days]);
  
  return { history, loading };
}