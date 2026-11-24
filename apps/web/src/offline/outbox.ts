import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { createOrderInputSchema, orderSchema, type CreateOrderInput } from '@food-stack/shared';
import { ApiError, request } from '../api/client';
import { getAuthState, subscribeAuth } from '../auth/auth-store';
import { upsertOrder } from '../orders/orders-store';
import { socket } from '../realtime/socket';

const STORAGE_PREFIX = 'food-stack:outbox:';
const RETRY_INTERVAL_MS = 15_000;

const queuedOrderSchema = z.object({
  input: createOrderInputSchema.required({ id: true }),
  queuedAt: z.string().datetime(),
  status: z.enum(['pending', 'failed']),
  error: z.string().optional(),
});
export type QueuedOrder = z.infer<typeof queuedOrderSchema>;

const queueSchema = z.array(queuedOrderSchema);

let userId: string | null = null;
let entries: readonly QueuedOrder[] = [];
let inflight: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const storageKey = (id: string): string => STORAGE_PREFIX + id;

function load(id: string): readonly QueuedOrder[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    const parsed = queueSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function commit(next: readonly QueuedOrder[]): void {
  entries = next;
  if (userId) {
    try {
      if (next.length === 0) localStorage.removeItem(storageKey(userId));
      else localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch {
      // Sem persistência: a fila continua em memória até recarregar a página.
    }
  }
  listeners.forEach((listener) => listener());
  syncTimer();
}

function syncTimer(): void {
  const hasPending = entries.some((entry) => entry.status === 'pending');
  if (hasPending && !timer) timer = setInterval(() => void flushOutbox(), RETRY_INTERVAL_MS);
  if (!hasPending && timer) {
    clearInterval(timer);
    timer = null;
  }
}

const isDefinitiveRejection = (failure: unknown): failure is ApiError =>
  failure instanceof ApiError &&
  failure.status !== undefined &&
  failure.status >= 400 &&
  failure.status < 500 &&
  ![401, 408, 429].includes(failure.status);

async function run(): Promise<void> {
  if (!userId) return;
  const attempted = new Set<string>();
  for (;;) {
    const next = entries.find((entry) => entry.status === 'pending' && !attempted.has(entry.input.id));
    if (!next) return;
    attempted.add(next.input.id);
    try {
      const order = await request('POST', '/orders', orderSchema, next.input);
      commit(entries.filter((entry) => entry.input.id !== next.input.id));
      upsertOrder(order);
    } catch (failure) {
      if (!isDefinitiveRejection(failure)) return; // sem rede, 5xx ou sessão: tenta de novo depois
      commit(
        entries.map((entry) =>
          entry.input.id === next.input.id
            ? { ...entry, status: 'failed' as const, error: failure.message }
            : entry,
        ),
      );
    }
  }
}

/** Envia, em ordem, os pedidos pendentes. Chamadas simultâneas compartilham a mesma execução. */
export function flushOutbox(): Promise<void> {
  if (!inflight) {
    inflight = run().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export type SubmitResult = 'sent' | 'queued';

/**
 * Registra o pedido na fila local e tenta enviar na hora. Se a rede falhar o
 * pedido fica guardado e é reenviado ao reconectar. Rejeições definitivas do
 * servidor (ex.: mesa inexistente) viram erro para o atendente corrigir.
 */
export async function submitOrder(input: Omit<CreateOrderInput, 'id'>): Promise<SubmitResult> {
  if (!userId) throw new ApiError('Sessão não encontrada. Entre novamente.');
  const id = crypto.randomUUID();
  commit([
    ...entries,
    { input: { ...input, id }, queuedAt: new Date().toISOString(), status: 'pending' },
  ]);

  await flushOutbox();
  let entry = entries.find((current) => current.input.id === id);
  if (entry?.status === 'pending') {
    await flushOutbox();
    entry = entries.find((current) => current.input.id === id);
  }

  if (!entry) return 'sent';
  if (entry.status === 'failed') {
    commit(entries.filter((current) => current.input.id !== id));
    throw new ApiError(entry.error ?? 'Não foi possível enviar o pedido.');
  }
  return 'queued';
}

export function discardQueued(id: string): void {
  commit(entries.filter((entry) => entry.input.id !== id));
}

export function retryQueued(id: string): void {
  commit(
    entries.map((entry) =>
      entry.input.id === id ? { ...entry, status: 'pending' as const, error: undefined } : entry,
    ),
  );
  void flushOutbox();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useOutbox = (): readonly QueuedOrder[] => useSyncExternalStore(subscribe, () => entries);

// A fila pertence ao usuário logado: troca de usuário carrega a fila do outro.
subscribeAuth(() => {
  const next = getAuthState().user?.id ?? null;
  if (next === userId) return;
  userId = next;
  entries = next ? load(next) : [];
  listeners.forEach((listener) => listener());
  syncTimer();
  if (next) void flushOutbox();
});

socket.on('connect', () => void flushOutbox());
window.addEventListener('online', () => void flushOutbox());
