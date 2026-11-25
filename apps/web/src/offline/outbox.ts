import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import {
  createOrderInputSchema,
  openTableSessionInputSchema,
  orderSchema,
  tableSessionSchema,
  type CreateOrderInput,
  type OpenTableSessionInput,
} from '@food-stack/shared';
import { ApiError, request } from '../api/client';
import { getAuthState, subscribeAuth } from '../auth/auth-store';
import { upsertOrder } from '../orders/orders-store';
import { socket } from '../realtime/socket';
import { upsertTableSession } from '../table-sessions/table-sessions-store';
import { generateUuid } from '../lib/uuid';

const STORAGE_PREFIX = 'food-stack:outbox:';
const RETRY_INTERVAL_MS = 15_000;

const queueMeta = {
  queuedAt: z.string().datetime(),
  status: z.enum(['pending', 'failed']),
  error: z.string().optional(),
};

const queuedOrderSchema = z.object({
  kind: z.literal('order'),
  input: createOrderInputSchema.required({ id: true }),
  ...queueMeta,
});
const queuedOpenTableSchema = z.object({
  kind: z.literal('open_table'),
  input: openTableSessionInputSchema.required({ id: true }),
  ...queueMeta,
});

// Entradas gravadas antes de existir `kind` eram sempre pedidos.
const withKind = (value: unknown): unknown =>
  typeof value === 'object' && value !== null && !('kind' in value)
    ? { ...value, kind: 'order' }
    : value;

const queuedEntrySchema = z.preprocess(
  withKind,
  z.discriminatedUnion('kind', [queuedOrderSchema, queuedOpenTableSchema]),
);

export type QueuedOrder = z.infer<typeof queuedOrderSchema>;
export type QueuedOpenTable = z.infer<typeof queuedOpenTableSchema>;
export type QueuedEntry = QueuedOrder | QueuedOpenTable;

const queueSchema = z.array(queuedEntrySchema);

let userId: string | null = null;
let entries: readonly QueuedEntry[] = [];
let inflight: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const storageKey = (id: string): string => STORAGE_PREFIX + id;

function load(id: string): readonly QueuedEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    const parsed = queueSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function commit(next: readonly QueuedEntry[]): void {
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

const without = (id: string): readonly QueuedEntry[] =>
  entries.filter((entry) => entry.input.id !== id);

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

async function deliver(entry: QueuedEntry): Promise<void> {
  if (entry.kind === 'order') {
    const order = await request('POST', '/orders', orderSchema, entry.input);
    commit(without(entry.input.id));
    upsertOrder(order);
    return;
  }
  const session = await request('POST', '/table-sessions', tableSessionSchema, entry.input);
  // A mesa passa do rascunho local para a lista do servidor sem ficar um instante livre.
  upsertTableSession(session);
  commit(without(entry.input.id));
}

async function run(): Promise<void> {
  if (!userId) return;
  const attempted = new Set<string>();
  for (;;) {
    const next = entries.find((entry) => entry.status === 'pending' && !attempted.has(entry.input.id));
    if (!next) return;
    attempted.add(next.input.id);
    try {
      await deliver(next);
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

/** Envia, em ordem, as entradas pendentes. Chamadas simultâneas compartilham a mesma execução. */
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
 * Registra a entrada na fila local e tenta enviar na hora. Se a rede falhar ela
 * fica guardada e é reenviada ao reconectar. Rejeições definitivas do servidor
 * (ex.: mesa inexistente ou já aberta) viram erro para o atendente corrigir.
 */
async function enqueue(entry: QueuedEntry, failureMessage: string): Promise<SubmitResult> {
  if (!userId) throw new ApiError('Sessão não encontrada. Entre novamente.');
  const id = entry.input.id;
  commit([...entries, entry]);

  await flushOutbox();
  let current = entries.find((candidate) => candidate.input.id === id);
  if (current?.status === 'pending') {
    await flushOutbox();
    current = entries.find((candidate) => candidate.input.id === id);
  }

  if (!current) return 'sent';
  if (current.status === 'failed') {
    commit(without(id));
    throw new ApiError(current.error ?? failureMessage);
  }
  return 'queued';
}

export const submitOrder = (input: Omit<CreateOrderInput, 'id'>): Promise<SubmitResult> =>
  enqueue(
    {
      kind: 'order',
      input: { ...input, id: generateUuid() },
      queuedAt: new Date().toISOString(),
      status: 'pending',
    },
    'Não foi possível enviar o pedido.',
  );

export const submitOpenTable = (input: Omit<OpenTableSessionInput, 'id'>): Promise<SubmitResult> =>
  enqueue(
    {
      kind: 'open_table',
      input: { ...input, id: generateUuid() },
      queuedAt: new Date().toISOString(),
      status: 'pending',
    },
    'Não foi possível abrir a mesa.',
  );

export function discardQueued(id: string): void {
  commit(without(id));
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

export const useOutbox = (): readonly QueuedEntry[] => useSyncExternalStore(subscribe, () => entries);

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
