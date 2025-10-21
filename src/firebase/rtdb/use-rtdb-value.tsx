'use client';
import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { useDatabase } from '@/firebase';

const useRtdbValue = (path: string) => {
  const { database } = useDatabase();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path || !database) {
        setLoading(false);
        return;
    }

    setLoading(true);
    const dbRef = ref(database, path);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      setData(snapshot.val());
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(err);
      setLoading(false);
    });

    return () => {
      off(dbRef, 'value', unsubscribe);
    };
  }, [path, database]);

  return { data, loading, error };
};

export default useRtdbValue;
