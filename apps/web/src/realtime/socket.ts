import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

// Conecta somente após o login (ver auth-store); o cookie de sessão autentica o handshake.
export const socket = io({ autoConnect: false });

const subscribe = (listener: () => void): (() => void) => {
  socket.on('connect', listener);
  socket.on('disconnect', listener);
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    socket.off('connect', listener);
    socket.off('disconnect', listener);
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

// O navegador avisa a perda de rede na hora; o socket sozinho só percebe pelo timeout do ping.
export const useIsConnected = (): boolean =>
  useSyncExternalStore(subscribe, () => socket.connected && navigator.onLine);
