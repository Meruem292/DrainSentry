import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "./use-toast";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Create Express session when Firebase user signs in
          try {
            // Get Firebase ID token for server verification
            const idToken = await firebaseUser.getIdToken();
            
            const response = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });
            
            if (response.ok) {
              const data = await response.json();
              setSessionUser(data.user);
            } else {
              console.error('Failed to verify auth with server');
            }
          } catch (error) {
            console.error('Error verifying auth:', error);
          }
        } else {
          setSessionUser(null);
        }
        
        setLoading(false);
      },
      (error) => {
        console.error("Auth state change error:", error);
        toast({
          title: "Authentication Error",
          description: "There was an error with the authentication process.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  return { user, sessionUser, loading };
}
