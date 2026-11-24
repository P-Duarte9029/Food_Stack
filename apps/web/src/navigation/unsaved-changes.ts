import { useSyncExternalStore } from 'react';

export const GUARDED_HASH = '#/controle';

let unsaved = false;
let lastHash = location.hash;
const listeners = new Set<() => void>();

export function setUnsavedChanges(value: boolean): void {
  if (unsaved === value) return;
  unsaved = value;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useHasUnsavedChanges = (): boolean => useSyncExternalStore(subscribe, () => unsaved);

// Registrado na importação, antes dos listeners do React, para restaurar a URL
// antes de qualquer re-render (botão voltar, hash digitado, links externos).
window.addEventListener('hashchange', () => {
  if (unsaved && location.hash !== GUARDED_HASH) {
    history.replaceState(null, '', lastHash);
    return;
  }
  lastHash = location.hash;
});

window.addEventListener('beforeunload', (event) => {
  if (unsaved) event.preventDefault();
});
