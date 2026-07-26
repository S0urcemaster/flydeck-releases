import { useEffect, useState } from "react";
import { healthApi } from "../api/health";

export function useServerHealth() {
  const [vital, setVital] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const health = await healthApi.read();
        if (!cancelled) setVital(health.status === "ok");
      } catch {
        if (!cancelled) setVital(false);
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return vital;
}
