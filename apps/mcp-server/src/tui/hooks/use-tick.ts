import { useState, useEffect } from 'react';

export function useTick(intervalMs = 1000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(prev => prev + 1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
