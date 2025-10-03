import admin from "firebase-admin";

let isFirebaseInitialized = false;

// Initialize Firebase Admin SDK
// We simplify the initialization to let Firebase automatically detect credentials.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      databaseURL: "https://drainsentry-default-rtdb.firebaseio.com",
    });
    isFirebaseInitialized = true;
  } catch (error: any) {
    console.warn("***********************************************************************");
    console.warn("WARNING: Firebase Admin SDK initialization failed.");
    console.warn("This is expected in a local environment without service account credentials.");
    console.warn("Push notifications will be simulated in the console.");
    console.warn(`Error details: ${error.message}`);
    console.warn("***********************************************************************");
  }
} else {
  isFirebaseInitialized = true;
}

const database = isFirebaseInitialized ? admin.database() : null;

export { admin, database, isFirebaseInitialized };