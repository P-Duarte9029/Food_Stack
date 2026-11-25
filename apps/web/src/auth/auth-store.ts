import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { sessionUserSchema, type LoginInput, type SessionUser } from '@food-stack/shared';
import { ApiError, request, setUnauthorizedHandler } from '../api/client';
import { socket } from '../realtime/socket';
import { clearRemoteCaches, hydrateRemoteStores } from '../store/remote-store';

interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated';
  user: SessionUser | null;
}

const SESSION_USER_KEY = 'food-stack:session-user';

let state: AuthState = { status: 'loading', user: null };
const listeners = new Set<() => void>();

function readCachedUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    const parsed = sessionUserSchema.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: SessionUser | null): void {
  try {
    if (user) localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // Sem persistência: só afeta a abertura do app offline.
  }
}

function commit(next: AuthState): void {
  state = next;
  if (next.user) hydrateRemoteStores(next.user.id);
  if (next.status === 'authenticated') socket.connect();
  else socket.disconnect();
  listeners.forEach((listener) => listener());
}

export const getAuthState = (): AuthState => state;

export const subscribeAuth = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAuth = (): AuthState => useSyncExternalStore(subscribeAuth, getAuthState);

function becomeAnonymous(): void {
  writeCachedUser(null);
  commit({ status: 'anonymous', user: null });
}

setUnauthorizedHandler(becomeAnonymous);

// O servidor derruba o socket quando a sessão é encerrada (ex.: usuário desativado).
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect' && state.status === 'authenticated') void restoreSession();
});

export async function restoreSession(): Promise<void> {
  try {
    const user = await request('GET', '/auth/me', sessionUserSchema);
    writeCachedUser(user);
    commit({ status: 'authenticated', user });
  } catch (failure) {
    // Sem rede não dá para validar a sessão: mantém a identidade conhecida para
    // que o app abra offline. O servidor continua decidindo as permissões.
    const cached = failure instanceof ApiError && failure.status === undefined ? readCachedUser() : null;
    if (cached) commit({ status: 'authenticated', user: cached });
    else becomeAnonymous();
  }
}

export async function login(input: LoginInput): Promise<void> {
  const user = await request('POST', '/auth/login', sessionUserSchema, input);
  writeCachedUser(user);
  commit({ status: 'authenticated', user });
}

export async function logout(): Promise<void> {
  try {
    await request('POST', '/auth/logout', z.null());
  } catch (failure) {
    // Sem confirmar o encerramento no servidor a sessão continuaria válida.
    if (!(failure instanceof ApiError && failure.status === 401)) throw failure;
  }
  writeCachedUser(null);
  clearRemoteCaches();
  // Recarrega para descartar todo estado em memória da sessão anterior.
  location.hash = '';
  location.reload();
}
