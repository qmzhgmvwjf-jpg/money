import { useEffect } from "react";

export function usePolling(callback, delay, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    callback();
    const interval = setInterval(callback, delay);
    return () => clearInterval(interval);
  }, [callback, delay, enabled]);
}
