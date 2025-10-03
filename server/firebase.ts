import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

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

// Initialize Firebase for server
const app = initializeApp(firebaseConfig, "server");
const database = getDatabase(app);

export { database, ref, get };
