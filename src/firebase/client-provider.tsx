'use client';
import { initializeFirebase, FirebaseProvider } from '@/firebase';

const { firebaseApp, auth, firestore, database } = initializeFirebase();

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      auth={auth}
      firestore={firestore}
      database={database}
    >
      {children}
    </FirebaseProvider>
  );
}
