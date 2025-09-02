import { ref, get, set, push, child, DatabaseReference } from "firebase/database";
import { database } from "./firebase";

// Get today's date in YYYY-MM-DD format
export function getFormattedDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Save a water level reading to history
export async function saveWaterLevelHistory(userId: string, deviceId: string, value: number) {
  const todayFormatted = getFormattedDate();
  const historyRef = ref(database, `users/${userId}/waterLevelHistory/${todayFormatted}/${deviceId}`);
  try {
    await set(historyRef, value);
    console.log("Water level history saved");
    return true;
  } catch (error) {
    console.error("Error saving water level history:", error);
    return false;
  }
}

// Save a waste bin reading to history
export async function saveWasteBinHistory(
  userId: string, 
  deviceId: string, 
  fullness: number, 
  weight: number
) {
  const todayFormatted = getFormattedDate();
  const historyRef = ref(database, `users/${userId}/wasteBinHistory/${todayFormatted}/${deviceId}`);
  try {
    await set(historyRef, {
      fullness,
      weight
    });
    console.log("Waste bin history saved");
    return true;
  } catch (error) {
    console.error("Error saving waste bin history:", error);
    return false;
  }
}

// Get water level history for a device for a specified date range
export async function getWaterLevelHistory(userId: string, deviceId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  const dateArray = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dateArray.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const history = [];
  
  for (const date of dateArray) {
    const historyRef = ref(database, `users/${userId}/waterLevelHistory/${date}/${deviceId}`);
    try {
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        history.push({
          date,
          value: snapshot.val()
        });
      }
    } catch (error) {
      console.error(`Error getting water level history for ${date}:`, error);
    }
  }
  
  return history;
}

// Get waste bin history for a device for a specified date range
export async function getWasteBinHistory(userId: string, deviceId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  const dateArray = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dateArray.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const history = [];
  
  for (const date of dateArray) {
    const historyRef = ref(database, `users/${userId}/wasteBinHistory/${date}/${deviceId}`);
    try {
      const snapshot = await get(historyRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        history.push({
          date,
          fullness: data.fullness || 0,
          weight: data.weight || 0
        });
      }
    } catch (error) {
      console.error(`Error getting waste bin history for ${date}:`, error);
    }
  }
  
  return history;
}