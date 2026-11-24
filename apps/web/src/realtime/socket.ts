import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

export const socket = io();

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
