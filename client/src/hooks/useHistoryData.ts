import { useState, useEffect } from "react";
import { ref, onValue, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "./useAuth";

// Define the history entry interfaces
export interface WaterLevelHistoryEntry {
  date: string;
  value: number;
}

export interface WasteBinHistoryEntry {
  date: string;
  fullness: number;
  weight: number;
}

export function useWaterLevelHistory(deviceContainerId: string, days: number = 30) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WaterLevelHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !deviceContainerId) {
      setLoading(false);
      return;
    }

    // Get current date
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Format dates for lookup
    const formattedDates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      formattedDates.push(formattedDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get historical water level data
    const historyData: WaterLevelHistoryEntry[] = [];
    let pendingRequests = formattedDates.length;

    formattedDates.forEach(date => {
      const historyRef = ref(database, `users/${user.uid}/waterLevelHistory/${date}/${deviceContainerId}`);
      
      get(historyRef).then((snapshot) => {
        if (snapshot.exists()) {
          historyData.push({
            date,
            value: snapshot.val()
          });
        }
        
        pendingRequests--;
        if (pendingRequests === 0) {
          // Sort by date
          historyData.sort((a, b) => a.date.localeCompare(b.date));
          setHistory(historyData);
          setLoading(false);
        }
      }).catch(error => {
        console.error("Error fetching water level history:", error);
        pendingRequests--;
        if (pendingRequests === 0) {
          setHistory(historyData);
          setLoading(false);
        }
      });
    });

    return () => {
      // Cleanup if needed
    };
  }, [user, deviceContainerId, days]);

  return { history, loading };
}

export function useWasteBinHistory(deviceContainerId: string, days: number = 30) {
  const { user } = useAuth();
  const [history, setHistory] = useState<WasteBinHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !deviceContainerId) {
      setLoading(false);
      return;
    }

    // Get current date
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Format dates for lookup
    const formattedDates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const formattedDate = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      formattedDates.push(formattedDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get historical waste bin data
    const historyData: WasteBinHistoryEntry[] = [];
    let pendingRequests = formattedDates.length;

    formattedDates.forEach(date => {
      const historyRef = ref(database, `users/${user.uid}/wasteBinHistory/${date}/${deviceContainerId}`);
      
      get(historyRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          historyData.push({
            date,
            fullness: data.fullness || 0,
            weight: data.weight || 0
          });
        }
        
        pendingRequests--;
        if (pendingRequests === 0) {
          // Sort by date
          historyData.sort((a, b) => a.date.localeCompare(b.date));
          setHistory(historyData);
          setLoading(false);
        }
      }).catch(error => {
        console.error("Error fetching waste bin history:", error);
        pendingRequests--;
        if (pendingRequests === 0) {
          setHistory(historyData);
          setLoading(false);
        }
      });
    });

    return () => {
      // Cleanup if needed
    };
  }, [user, deviceContainerId, days]);

  return { history, loading };
}