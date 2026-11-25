import { useState, type FormEvent } from 'react';
import { CloudOff, DoorClosed, DoorOpen } from 'lucide-react';
import { CUSTOMER_NAME_MAX_LENGTH, customerNameSchema } from '@food-stack/shared';
import { submitOpenTable, useOutbox } from '../../offline/outbox';
import { useIsConnected } from '../../realtime/socket';
import { closeCheck, closeTableSession } from '../../table-sessions/table-sessions-store';
import type { OpenCheck, OpenTable } from '../../table-sessions/use-open-tables';
import { generateUuid } from '../../lib/uuid';
import { CheckPicker } from './CheckPicker';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const secondaryButton = `flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 disabled:opacity-40 ${focusRing}`;
const dangerButton = `flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 font-semibold text-white disabled:opacity-40 ${focusRing}`;

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
      await submitOpenTable({ table, customerName: parsed.data, checkId: generateUuid() });
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

type Confirming = 'check' | 'table' | null;

function OpenTableSummary({
  session,
  activeCheck,
  onCheckChange,
}: {
  session: OpenTable;
  activeCheck: OpenCheck | undefined;
  onCheckChange: (checkId: string) => void;
}) {
  const connected = useIsConnected();
  const outbox = useOutbox();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queuedForTable = outbox.filter(
    (entry) =>
      (entry.kind === 'order' && entry.input.table === session.table) ||
      (entry.kind === 'add_check' && entry.input.tableSessionId === session.id),
  );
  const queuedForCheck = outbox.some(
    (entry) =>
      entry.kind === 'order' &&
      entry.input.table === session.table &&
      (entry.input.checkId === undefined || entry.input.checkId === activeCheck?.id),
  );
  const tableBlocked = session.pending
    ? 'Aguarde a abertura da mesa ser enviada.'
    : queuedForTable.length > 0
      ? 'Há pedidos ou comandas desta mesa aguardando envio.'
      : !connected
        ? 'Sem conexão com o servidor.'
        : null;
  const checkBlocked =
    activeCheck === undefined
      ? 'Esta mesa não tem comandas para fechar separadamente.'
      : activeCheck.pending
        ? 'Aguarde a comanda ser enviada.'
        : session.pending
          ? 'Aguarde a abertura da mesa ser enviada.'
          : queuedForCheck
            ? 'Há pedidos desta comanda aguardando envio.'
            : !connected
              ? 'Sem conexão com o servidor.'
              : null;
  const isLastCheck = session.checks.length <= 1;

  const run = async (action: () => Promise<void>, fallback: string) => {
    setClosing(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(messageOf(failure, fallback));
    } finally {
      setConfirming(null);
      setClosing(false);
    }
  };

  return (
    <div>
      <CheckPicker session={session} activeId={activeCheck?.id} onChange={onCheckChange} />
      {session.pending && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
          <CloudOff aria-hidden className="size-4" />
          Abertura aguardando conexão para enviar
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-slate-200 pt-4">
        {confirming === null ? (
          <div className="flex flex-wrap gap-2">
            {activeCheck && (
              <button
                type="button"
                disabled={checkBlocked !== null}
                onClick={() => setConfirming('check')}
                className={secondaryButton}
              >
                <DoorClosed aria-hidden className="size-5" />
                Fechar comanda de {activeCheck.name}
              </button>
            )}
            <button
              type="button"
              disabled={tableBlocked !== null}
              onClick={() => setConfirming('table')}
              className={secondaryButton}
            >
              <DoorClosed aria-hidden className="size-5" />
              Fechar mesa
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-800">
              {confirming === 'table'
                ? `Fechar a mesa ${session.table} encerra todas as comandas abertas.`
                : isLastCheck
                  ? `Esta é a última comanda: fechar a de ${activeCheck?.name ?? ''} também fecha a mesa ${session.table}.`
                  : `Fechar a comanda de ${activeCheck?.name ?? ''}. As outras continuam abertas.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={closing}
                onClick={() =>
                  void run(
                    confirming === 'table'
                      ? () => closeTableSession(session.id)
                      : () => closeCheck(session.id, activeCheck?.id ?? ''),
                    confirming === 'table'
                      ? 'Não foi possível fechar a mesa.'
                      : 'Não foi possível fechar a comanda.',
                  )
                }
                className={dangerButton}
              >
                {closing ? 'Fechando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                disabled={closing}
                onClick={() => setConfirming(null)}
                className={secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {confirming === null && (checkBlocked ?? tableBlocked) && (
          <p className="mt-2 text-sm text-slate-600">{checkBlocked ?? tableBlocked}</p>
        )}
      </div>
    </div>
  );
}

export function TableSessionPanel({
  table,
  session,
  activeCheck,
  onCheckChange,
}: {
  table: number;
  session: OpenTable | undefined;
  activeCheck: OpenCheck | undefined;
  onCheckChange: (checkId: string) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-bold text-slate-900">
        Mesa {table} · {session ? 'ocupada' : 'livre'}
      </h3>
      {session ? (
        <OpenTableSummary
          key={session.id}
          session={session}
          activeCheck={activeCheck}
          onCheckChange={onCheckChange}
        />
      ) : (
        <OpenTableForm key={table} table={table} />
      )}
    </div>
  );
}
