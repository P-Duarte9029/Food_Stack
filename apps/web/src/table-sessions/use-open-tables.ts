import type { GuestCheck, TableSession } from '@food-stack/shared';
import { useOutbox } from '../offline/outbox';
import { useTableSessions } from './table-sessions-store';

/** Comanda como o atendente a vê: `pending` quando ainda não chegou ao servidor. */
export interface OpenCheck extends GuestCheck {
  pending: boolean;
}

/** Mesa aberta como o atendente a vê: `pending` quando a abertura ainda não chegou ao servidor. */
export interface OpenTable extends Omit<TableSession, 'checks'> {
  pending: boolean;
  checks: readonly OpenCheck[];
}

/** Mesas abertas no servidor mais as aberturas e comandas guardadas na fila offline. */
export function useOpenTables(): readonly OpenTable[] {
  const confirmed = useTableSessions();
  const outbox = useOutbox();

  const confirmedTables = confirmed.map(
    (session): OpenTable => ({
      ...session,
      pending: false,
      checks: session.checks.map((check) => ({ ...check, pending: false })),
    }),
  );
  const known = new Set(confirmed.map((session) => session.id));
  const pendingTables = outbox.flatMap((entry): OpenTable[] =>
    entry.kind === 'open_table' && entry.status === 'pending' && !known.has(entry.input.id)
      ? [
          {
            id: entry.input.id,
            table: entry.input.table,
            customerName: entry.input.customerName,
            openedAt: entry.queuedAt,
            pending: true,
            checks: entry.input.checkId
              ? [{ id: entry.input.checkId, name: entry.input.customerName, pending: true }]
              : [],
          },
        ]
      : [],
  );
  const pendingChecks = outbox.flatMap((entry) =>
    entry.kind === 'add_check' && entry.status === 'pending' ? [entry.input] : [],
  );

  return [...confirmedTables, ...pendingTables].map((session) => {
    const added = pendingChecks
      .filter(
        (check) =>
          check.tableSessionId === session.id &&
          !session.checks.some((current) => current.id === check.id),
      )
      .map((check): OpenCheck => ({ id: check.id, name: check.name, pending: true }));
    return added.length === 0 ? session : { ...session, checks: [...session.checks, ...added] };
  });
}
