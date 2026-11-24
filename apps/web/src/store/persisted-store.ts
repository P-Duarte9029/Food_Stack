import { useSyncExternalStore } from 'react';
import type { ZodType } from 'zod';

export interface PersistedStore<T> {
  get: () => T;
  set: (next: T) => void;
  use: () => T;
}

export function createPersistedStore<T>(
  key: string,
  schema: ZodType<T>,
  fallback: T,
): PersistedStore<T> {
  const listeners = new Set<() => void>();

  const load = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : fallback;
    } catch {
      return fallback;
    }
  };

  let value = load();
  const notify = () => listeners.forEach((listener) => listener());

  window.addEventListener('storage', (event) => {
    if (event.key !== key) return;
    value = load();
    notify();
  });

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    get: () => value,
    set: (next) => {
      value = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Sem persistência: o estado em memória continua válido.
      }
      notify();
    },
    use: () => useSyncExternalStore(subscribe, () => value),
  };
}
