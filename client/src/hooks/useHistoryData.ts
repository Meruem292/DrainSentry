import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "./useAuth";

export interface HistoryEntry {
  timestamp: string;
  [key: string]: any;
}

const useHistory = (deviceId: string, historyType: "waterLevelHistory" | "wasteBinHistory") => {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !deviceId) {
      setLoading(false);
      return;
    }

    // First, get all devices to find the Firebase key for the given device ID
    const devicesRef = ref(database, `users/${user.uid}/devices`);
    
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      if (snapshot.exists()) {
        const devices = snapshot.val();
        let deviceKey = null;
        
        // Find the device key by matching the device ID
        Object.entries(devices).forEach(([key, device]: [string, any]) => {
          if (device.id === deviceId) {
            deviceKey = key;
          }
        });
        
        if (deviceKey) {
          // Now get the history for this device
          const historyRef = ref(database, `users/${user.uid}/devices/${deviceKey}/${historyType}`);
          
          onValue(historyRef, (historySnapshot) => {
            if (historySnapshot.exists()) {
              const data = historySnapshot.val();
              const historyData = Object.entries(data).map(([key, value]) => ({
                id: key,
                ...(value as any),
              }));
              // Sort by timestamp
              historyData.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              setHistory(historyData);
            } else {
              setHistory([]);
            }
            setLoading(false);
          });
        } else {
          setHistory([]);
          setLoading(false);
        }
      } else {
        setHistory([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, deviceId, historyType]);

  return { history, loading };
};

export const useWaterLevelHistory = (deviceId: string) => {
  return useHistory(deviceId, "waterLevelHistory");
};

export const useWasteBinHistory = (deviceId: string) => {
  return useHistory(deviceId, "wasteBinHistory");
};
