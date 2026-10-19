import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

type StoredValue<T> = { version: 1; value: T };

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as StoredValue<T>;
    return parsed?.version === 1 ? parsed.value : fallback;
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue));

  useEffect(() => {
    try {
      const stored: StoredValue<T> = { version: 1, value };
      window.localStorage.setItem(key, JSON.stringify(stored));
    } catch {
      // Storage may be unavailable or full; the model remains usable in memory.
    }
  }, [key, value]);

  return [value, setValue];
}
