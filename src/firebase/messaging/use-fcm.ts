"use client";

import { useState, useEffect } from "react";
import { getToken, deleteToken } from "firebase/messaging";
import { messaging } from "@/firebase";

const useFCM = () => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && messaging) {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            throw new Error("VAPID key not found in environment variables.");
        }
        const fcmToken = await getToken(messaging, { vapidKey });
        if (fcmToken) {
          setToken(fcmToken);
          return true;
        } else {
           console.log("No registration token available. Request permission to generate one.");
           return false;
        }
      } else {
        console.log("Notification permission denied.");
        return false;
      }
    } catch (err) {
      console.error("An error occurred while retrieving token. ", err);
      setError(err);
      return false;
    }
  };

  const deleteFCMToken = async () => {
    if (messaging) {
      try {
        await deleteToken(messaging);
        setToken(null);
      } catch (err) {
        console.error("Error deleting token", err);
      }
    }
  };

  return { token, requestPermission, deleteToken: deleteFCMToken, error };
};

export default useFCM;
