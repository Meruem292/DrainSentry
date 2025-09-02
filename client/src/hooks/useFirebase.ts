import { useEffect, useState } from "react";
import { ref, onValue, DatabaseReference } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from "./useAuth";

export function useFirebaseData<T>(path: string, defaultValue: T): { data: T; loading: boolean } {
  const { user } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const dataRef = ref(database, `users/${user.uid}/${path}`);
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const fetchedData = snapshot.val();
      if (fetchedData) {
        setData(fetchedData);
      } else {
        setData(defaultValue);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, path, defaultValue]);

  return { data, loading };
}

export function useFirebaseList<T>(path: string): { list: T[]; loading: boolean; reference: DatabaseReference | null } {
  const { user } = useAuth();
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState<DatabaseReference | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const dataRef = ref(database, `users/${user.uid}/${path}`);
    setReference(dataRef);
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const fetchedData = snapshot.val();
      if (fetchedData) {
        const dataList = Object.entries(fetchedData).map(([id, value]) => ({
          id,
          ...(value as object),
        })) as T[];
        setList(dataList);
      } else {
        setList([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, path]);

  return { list, loading, reference };
}
