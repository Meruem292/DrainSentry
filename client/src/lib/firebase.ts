import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD50Lsmg3khTmYkGiu7LREqivXsBkePQMI",
  authDomain: "drainsentry.firebaseapp.com",
  databaseURL: "https://drainsentry-default-rtdb.firebaseio.com",
  projectId: "drainsentry",
  storageBucket: "drainsentry.firebasestorage.app",
  messagingSenderId: "610406293973",
  appId: "1:610406293973:web:e112664f4dbfd9d6dd1d5c",
  measurementId: "G-PF2451RX9Q",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let messaging: any = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app);
}

export { app, auth, database, messaging };
