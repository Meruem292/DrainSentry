import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import { WaterLevel, WasteBin } from "@/types";

/**
 * Custom hook to fetch and monitor the latest device readings
 * This ensures we always display the most recent sensor data
 */
export function useLatestDeviceData() {
  const { user } = useAuth();
  const [waterLevels, setWaterLevels] = useState<Record<string, WaterLevel>>({});
  const [wasteBins, setWasteBins] = useState<Record<string, WasteBin>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // References to Firebase database nodes
    const waterLevelsRef = ref(database, `users/${user.uid}/waterLevels`);
    const wasteBinsRef = ref(database, `users/${user.uid}/wasteBins`);

    // Subscribe to water level data
    const waterLevelsUnsubscribe = onValue(waterLevelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Process the data to ensure numeric values
        const processedData: Record<string, WaterLevel> = {};
        Object.entries(data).forEach(([key, value]) => {
          const waterLevel = value as WaterLevel;
          if (waterLevel.id) {
            // Make sure level is a number
            waterLevel.level = typeof waterLevel.level === 'number' ? waterLevel.level : Number(waterLevel.level) || 0;
            processedData[waterLevel.id] = waterLevel;
          } else {
            processedData[key] = waterLevel;
          }
        });
        console.log("Latest water levels:", processedData);
        setWaterLevels(processedData);
      } else {
        setWaterLevels({});
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching water level data:", error);
      setLoading(false);
    });

    // Subscribe to waste bin data
    const wasteBinsUnsubscribe = onValue(wasteBinsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Process the data to ensure numeric values
        const processedData: Record<string, WasteBin> = {};
        Object.entries(data).forEach(([key, value]) => {
          const wasteBin = value as WasteBin;
          if (wasteBin.id) {
            // Make sure fullness and weight are numbers
            wasteBin.fullness = typeof wasteBin.fullness === 'number' ? wasteBin.fullness : Number(wasteBin.fullness) || 0;
            wasteBin.weight = typeof wasteBin.weight === 'number' ? wasteBin.weight : Number(wasteBin.weight) || 0;
            processedData[wasteBin.id] = wasteBin;
          } else {
            processedData[key] = wasteBin;
          }
        });
        console.log("Latest waste bins:", processedData);
        setWasteBins(processedData);
      } else {
        setWasteBins({});
      }
    }, (error) => {
      console.error("Error fetching waste bin data:", error);
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      waterLevelsUnsubscribe();
      wasteBinsUnsubscribe();
    };
  }, [user]);

  return { waterLevels, wasteBins, loading };
}