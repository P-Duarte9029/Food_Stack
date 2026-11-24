import { useSyncExternalStore } from 'react';
import { socket } from '../realtime/socket';

interface Snapshot<T> {
  value: T;
  loaded: boolean;
}

export interface RemoteStore<T> {
  set: (value: T) => void;
  use: () => T;
  useLoaded: () => boolean;
}

/**
 * Estado vindo do servidor. Recarrega a cada (re)conexão do socket, o que
 * recupera qualquer evento perdido enquanto o cliente estava offline.
 */
export function createRemoteStore<T>(initial: T, load: () => Promise<T>): RemoteStore<T> {
  let snapshot: Snapshot<T> = { value: initial, loaded: false };
  const listeners = new Set<() => void>();

  const commit = (next: Snapshot<T>) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const refresh = () => {
    load()
      .then((value) => commit({ value, loaded: true }))
      .catch(() => undefined);
  };

  socket.on('connect', refresh);
  if (socket.connected) refresh();

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    set: (value) => commit({ value, loaded: true }),
    use: () => useSyncExternalStore(subscribe, () => snapshot).value,
    useLoaded: () => useSyncExternalStore(subscribe, () => snapshot).loaded,
  };
}
