import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, fallback: T, validate: (value: unknown) => T | null) {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue === null) return fallback;
      try {
        return validate(JSON.parse(storedValue)) ?? fallback;
      } catch {
        return validate(storedValue) ?? fallback;
      }
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
