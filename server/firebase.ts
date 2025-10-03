import * as admin from "firebase-admin";

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

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: firebaseConfig.databaseURL,
  });
}

const database = admin.database();

export { admin, database };