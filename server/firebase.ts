import admin from "firebase-admin";
import { getDatabase, ref, get } from "firebase/database";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_ADMIN_SDK_JSON || "{}"
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://drainsentry-default-rtdb.firebaseio.com",
    });
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
  }
}

const adminDb = admin.database();
const messaging = admin.messaging();

// Export Firebase services
export { admin, adminDb, messaging, getDatabase, ref, get };