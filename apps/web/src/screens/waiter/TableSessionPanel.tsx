import { useState, type FormEvent } from 'react';
import { CloudOff, DoorClosed, DoorOpen } from 'lucide-react';
import { CUSTOMER_NAME_MAX_LENGTH, customerNameSchema } from '@food-stack/shared';
import { submitOpenTable, useOutbox } from '../../offline/outbox';
import { useIsConnected } from '../../realtime/socket';
import { closeTableSession } from '../../table-sessions/table-sessions-store';
import type { OpenTable } from '../../table-sessions/use-open-tables';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const secondaryButton = `flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 disabled:opacity-40 ${focusRing}`;

const messageOf = (failure: unknown, fallback: string): string =>
  failure instanceof Error ? failure.message : fallback;

function OpenTableForm({ table }: { table: number }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = customerNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Nome inválido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitOpenTable({ table, customerName: parsed.data });
      setName('');
    } catch (failure) {
      setError(messageOf(failure, 'Não foi possível abrir a mesa.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="mt-4 space-y-3">
      <div>
        <label htmlFor="cliente-nome" className="text-sm font-medium text-slate-700">
          Nome do cliente da mesa {table}
        </label>
        <input
          id="cliente-nome"
          type="text"
          autoComplete="off"
          maxLength={CUSTOMER_NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'cliente-erro' : undefined}
          className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`}
        />
        {error && (
          <p id="cliente-erro" role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={saving}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`}
      >
        <DoorOpen aria-hidden className="size-5" />
        {saving ? 'Abrindo...' : 'Abrir mesa'}
      </button>
    </form>
  );
}

function OpenTableSummary({ session }: { session: OpenTable }) {
  const connected = useIsConnected();
  const outbox = useOutbox();
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasQueuedOrders = outbox.some(
    (entry) => entry.kind === 'order' && entry.input.table === session.table,
  );
  const blockedReason = session.pending
    ? 'Aguarde a abertura da mesa ser enviada.'
    : hasQueuedOrders
      ? 'Há pedidos desta mesa aguardando envio.'
      : !connected
        ? 'Sem conexão com o servidor.'
        : null;

  const close = async () => {
    setClosing(true);
    setError(null);
    try {
      await closeTableSession(session.id);
    } catch (failure) {
      setError(messageOf(failure, 'Não foi possível fechar a mesa.'));
      setConfirming(false);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="mt-4">
      <p className="break-words text-slate-900">
        <span className="text-sm text-slate-600">Cliente: </span>
        <span className="font-semibold">{session.customerName}</span>
      </p>
      {session.pending && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <CloudOff aria-hidden className="size-4" />
          Abertura aguardando conexão para enviar
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <button
              type="button"
              disabled={closing || blockedReason !== null}
              onClick={() => void close()}
              className={`flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 font-semibold text-white disabled:opacity-40 ${focusRing}`}
            >
              <DoorClosed aria-hidden className="size-5" />
              {closing ? 'Fechando...' : `Confirmar fechamento da mesa ${session.table}`}
            </button>
            <button type="button" disabled={closing} onClick={() => setConfirming(false)} className={secondaryButton}>
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={blockedReason !== null}
            onClick={() => setConfirming(true)}
            className={secondaryButton}
          >
            <DoorClosed aria-hidden className="size-5" />
            Fechar mesa
          </button>
        )}
      </div>
      {blockedReason && <p className="mt-2 text-sm text-slate-600">{blockedReason}</p>}
    </div>
  );
}

export function TableSessionPanel({ table, session }: { table: number; session: OpenTable | undefined }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-slate-900">
        Mesa {table} · {session ? 'ocupada' : 'livre'}
      </h3>
      {session ? (
        <OpenTableSummary key={session.id} session={session} />
      ) : (
        <OpenTableForm key={table} table={table} />
      )}
    </div>
  );
}
