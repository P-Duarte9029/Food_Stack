import { useEffect, useState } from 'react';

export function useElapsedMinutes(isoDate: string, running = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [running]);

  return Math.max(0, Math.floor((now - new Date(isoDate).getTime()) / 60_000));
}
