import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { sessionUserSchema, type LoginInput, type SessionUser } from '@food-stack/shared';
import { request, setUnauthorizedHandler } from '../api/client';
import { socket } from '../realtime/socket';

interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated';
  user: SessionUser | null;
}

let state: AuthState = { status: 'loading', user: null };
const listeners = new Set<() => void>();

function commit(next: AuthState): void {
  state = next;
  if (next.status === 'authenticated') socket.connect();
  else socket.disconnect();
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAuth = (): AuthState => useSyncExternalStore(subscribe, () => state);

setUnauthorizedHandler(() => commit({ status: 'anonymous', user: null }));

// O servidor derruba o socket quando a sessão é encerrada (ex.: usuário desativado).
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect' && state.status === 'authenticated') void restoreSession();
});

export async function restoreSession(): Promise<void> {
  try {
    commit({ status: 'authenticated', user: await request('GET', '/auth/me', sessionUserSchema) });
  } catch {
    commit({ status: 'anonymous', user: null });
  }
}

export async function login(input: LoginInput): Promise<void> {
  const user = await request('POST', '/auth/login', sessionUserSchema, input);
  commit({ status: 'authenticated', user });
}

export async function logout(): Promise<void> {
  try {
    await request('POST', '/auth/logout', z.null());
  } finally {
    // Recarrega para descartar todo estado em memória da sessão anterior.
    location.hash = '';
    location.reload();
  }
}
