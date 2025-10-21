import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

import { 
  useAuth, 
  useFirebase, 
  useFirebaseApp, 
  useFirestore,
  FirebaseProvider
} from './provider';
import { FirebaseClientProvider } from './client-provider';
import { useUser } from './auth/use-user';


let firebaseApp: FirebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export function initializeFirebase() {
  return { firebaseApp, auth, firestore };
}

export { 
  useAuth,
  useUser,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  FirebaseProvider,
  FirebaseClientProvider,
  firebaseApp, 
  auth, 
  firestore 
};
