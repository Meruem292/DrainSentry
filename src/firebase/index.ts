import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getMessaging, Messaging } from 'firebase/messaging';
import { firebaseConfig } from './config';

import { 
  useAuth, 
  useFirebase, 
  useFirebaseApp, 
  useFirestore,
  useDatabase,
  FirebaseProvider
} from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useUser } from './auth/use-user';


let firebaseApp: FirebaseApp;
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    messaging = getMessaging(firebaseApp);
} else {
    // For server-side rendering
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
}


const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const database = getDatabase(firebaseApp);

export function initializeFirebase() {
  return { firebaseApp, auth, firestore, database, messaging };
}

export { 
  useAuth,
  useUser,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useDatabase,
  FirebaseProvider,
  FirebaseClientProvider,
  firebaseApp, 
  auth, 
  firestore,
  database,
  messaging
};
