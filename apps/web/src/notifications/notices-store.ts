import { useSyncExternalStore } from 'react';
import { subscribeAuth } from '../auth/auth-store';

export interface Notice {
  id: string;
  title: string;
  message: string;
}

const NOTICE_TTL_MS = 10_000;

let notices: readonly Notice[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function commit(next: readonly Notice[]): void {
  notices = next;
  listeners.forEach((listener) => listener());
}

export function dismissNotice(id: string): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  commit(notices.filter((notice) => notice.id !== id));
}

/** Mostra o aviso por alguns segundos. Um aviso com o mesmo id não é repetido. */
export function pushNotice(notice: Notice): void {
  if (notices.some((current) => current.id === notice.id)) return;
  commit([...notices, notice]);
  timers.set(
    notice.id,
    setTimeout(() => dismissNotice(notice.id), NOTICE_TTL_MS),
  );
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNotices = (): readonly Notice[] => useSyncExternalStore(subscribe, () => notices);

// Avisos pertencem ao usuário logado: ao trocar de usuário, os pendentes somem.
subscribeAuth(() => {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
  commit([]);
});
