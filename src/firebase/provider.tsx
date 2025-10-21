'use client';
import { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Database } from 'firebase/database';

export type FirebaseContextValue = {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  database: Database | null;
};

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({
  children,
  firebaseApp,
  auth,
  firestore,
  database,
}: {
  children: React.ReactNode;
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  database: Database;
}) {
  return (
    <FirebaseContext.Provider
      value={{
        firebaseApp,
        auth,
        firestore,
        database,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === null) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  const { firebaseApp } = useFirebase();
  if (firebaseApp === null) {
    throw new Error(
      'useFirebaseApp must be used within a FirebaseProvider with a non-null firebaseApp'
    );
  }
  return firebaseApp;
}

export function useAuth() {
  const { auth } = useFirebase();
  if (auth === null) {
    throw new Error(
      'useAuth must be used within a FirebaseProvider with a non-null auth'
    );
  }
  return { auth };
}

export function useFirestore() {
  const { firestore } = useFirebase();
  if (firestore === null) {
    throw new Error(
      'useFirestore must be used within a FirebaseProvider with a non-null firestore'
    );
  }
  return firestore;
}

export function useDatabase() {
    const { database } = useFirebase();
    if (database === null) {
      throw new Error(
        'useDatabase must be used within a FirebaseProvider with a non-null database'
      );
    }
    return { database };
}
