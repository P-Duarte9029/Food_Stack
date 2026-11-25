import { REALTIME_EVENTS, tableSessionSchema, type TableSession } from '@food-stack/shared';
import { z } from 'zod';
import { request } from '../api/client';
import { socket } from '../realtime/socket';
import { createRemoteStore } from '../store/remote-store';

const sessionsSchema = z.array(tableSessionSchema);

const store = createRemoteStore<TableSession[]>(
  [],
  () => request('GET', '/table-sessions', sessionsSchema),
  { key: 'table-sessions', schema: sessionsSchema },
);

socket.on(REALTIME_EVENTS.tableSessionsChanged, (payload: unknown) => {
  const parsed = sessionsSchema.safeParse(payload);
  if (parsed.success) store.set(parsed.data);
});

export function upsertTableSession(session: TableSession): void {
  const sessions = store.get();
  if (sessions.some((current) => current.id === session.id)) return;
  store.set([...sessions, session]);
}

/** Mesas abertas confirmadas pelo servidor. Aberturas ainda na fila local ficam em `useOpenTables`. */
export const useTableSessions = store.use;

export async function closeTableSession(id: string): Promise<void> {
  await request('POST', `/table-sessions/${id}/close`, z.null());
  store.set(store.get().filter((session) => session.id !== id));
}
