import type { TableSession } from '@food-stack/shared';
import { useOutbox } from '../offline/outbox';
import { useTableSessions } from './table-sessions-store';

/** Sessão aberta como o atendente a vê: `pending` quando a abertura ainda não chegou ao servidor. */
export interface OpenTable extends TableSession {
  pending: boolean;
}

/** Mesas abertas no servidor mais as aberturas guardadas na fila offline. */
export function useOpenTables(): readonly OpenTable[] {
  const confirmed = useTableSessions();
  const outbox = useOutbox();

  const pending = outbox.flatMap((entry): OpenTable[] =>
    entry.kind === 'open_table' && entry.status === 'pending'
      ? [{ ...entry.input, openedAt: entry.queuedAt, pending: true }]
      : [],
  );
  const alreadyConfirmed = new Set(confirmed.map((session) => session.id));

  return [
    ...confirmed.map((session) => ({ ...session, pending: false })),
    ...pending.filter((session) => !alreadyConfirmed.has(session.id)),
  ];
}
