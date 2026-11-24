import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

// Conecta somente após o login (ver auth-store); o cookie de sessão autentica o handshake.
export const socket = io({ autoConnect: false });

const subscribe = (listener: () => void): (() => void) => {
  socket.on('connect', listener);
  socket.on('disconnect', listener);
  return () => {
    socket.off('connect', listener);
    socket.off('disconnect', listener);
  };
};

export const useIsConnected = (): boolean =>
  useSyncExternalStore(subscribe, () => socket.connected);
