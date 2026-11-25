import { useSyncExternalStore } from 'react';
import { z, type ZodType } from 'zod';
import { socket } from '../realtime/socket';

interface Snapshot<T> {
  value: T;
  loaded: boolean;
}

export interface RemoteStore<T> {
  get: () => T;
  set: (value: T) => void;
  use: () => T;
  useLoaded: () => boolean;
  subscribe: (listener: () => void) => () => void;
}

interface CacheOptions<T> {
  key: string;
  schema: ZodType<T>;
}

const CACHE_PREFIX = 'food-stack:cache:';

interface Hydratable {
  hydrate: (userId: string) => void;
  setCacheUser: (userId: string | null) => void;
}

const registry = new Set<Hydratable>();

/** Carrega o último estado conhecido do usuário (uso offline). Chamado após o login. */
export function hydrateRemoteStores(userId: string): void {
  registry.forEach((store) => {
    store.setCacheUser(userId);
    store.hydrate(userId);
  });
}

export function clearRemoteCaches(): void {
  registry.forEach((store) => store.setCacheUser(null));
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Sem acesso ao armazenamento: nada a limpar.
  }
}

/**
 * Estado vindo do servidor. Recarrega a cada (re)conexão do socket, o que
 * recupera qualquer evento perdido enquanto o cliente estava offline. Com
 * `cache`, guarda o último valor por usuário para abrir o app sem conexão.
 */
export function createRemoteStore<T>(
  initial: T,
  load: () => Promise<T>,
  cache?: CacheOptions<T>,
): RemoteStore<T> {
  let snapshot: Snapshot<T> = { value: initial, loaded: false };
  let cacheUserId: string | null = null;
  const listeners = new Set<() => void>();
  const cacheSchema = cache ? z.object({ userId: z.string(), value: cache.schema }) : null;

  const commit = (next: Snapshot<T>) => {
    snapshot = next;
    if (cache && cacheUserId) {
      try {
        localStorage.setItem(
          CACHE_PREFIX + cache.key,
          JSON.stringify({ userId: cacheUserId, value: next.value }),
        );
      } catch {
        // Sem persistência: o estado em memória continua válido.
      }
    }
    listeners.forEach((listener) => listener());
  };

  const refresh = () => {
    load()
      .then((value) => commit({ value, loaded: true }))
      .catch(() => undefined);
  };

  socket.on('connect', refresh);
  if (socket.connected) refresh();

  if (cache && cacheSchema) {
    registry.add({
      setCacheUser: (userId) => {
        cacheUserId = userId;
      },
      hydrate: (userId) => {
        if (snapshot.loaded) return;
        try {
          const raw = localStorage.getItem(CACHE_PREFIX + cache.key);
          const parsed = cacheSchema.safeParse(raw ? JSON.parse(raw) : null);
          if (parsed.success && parsed.data.userId === userId) {
            snapshot = { value: parsed.data.value, loaded: true };
            listeners.forEach((listener) => listener());
          }
        } catch {
          // Cache ilegível: ignora e espera o servidor.
        }
      },
    });
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    get: () => snapshot.value,
    set: (value) => commit({ value, loaded: true }),
    subscribe,
    use: () => useSyncExternalStore(subscribe, () => snapshot).value,
    useLoaded: () => useSyncExternalStore(subscribe, () => snapshot).loaded,
  };
}
