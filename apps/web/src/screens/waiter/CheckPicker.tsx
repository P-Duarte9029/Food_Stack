import { useState, type FormEvent } from 'react';
import { CloudOff, UserPlus } from 'lucide-react';
import { CUSTOMER_NAME_MAX_LENGTH, customerNameSchema } from '@food-stack/shared';
import { generateUuid } from '../../lib/uuid';
import { submitAddCheck } from '../../offline/outbox';
import type { OpenTable } from '../../table-sessions/use-open-tables';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';

function AddPersonForm({
  session,
  onAdded,
  onCancel,
}: {
  session: OpenTable;
  onAdded: (checkId: string) => void;
  onCancel: () => void;
}) {
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
    const id = generateUuid();
    try {
      await submitAddCheck({ id, tableSessionId: session.id, name: parsed.data });
      onAdded(id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível adicionar a pessoa.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="mt-3 space-y-3">
      <div>
        <label htmlFor="pessoa-nome" className="text-sm font-medium text-slate-700">
          Nome da pessoa
        </label>
        <input
          id="pessoa-nome"
          type="text"
          autoComplete="off"
          autoFocus
          maxLength={CUSTOMER_NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'pessoa-erro' : undefined}
          className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`}
        />
        {error && (
          <p id="pessoa-erro" role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`}
        >
          {saving ? 'Adicionando...' : 'Adicionar'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className={`flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 disabled:opacity-40 ${focusRing}`}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Comandas da mesa: escolhe a pessoa que fará o pedido e adiciona novas pessoas. */
export function CheckPicker({
  session,
  activeId,
  onChange,
}: {
  session: OpenTable;
  activeId: string | undefined;
  onChange: (checkId: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-4">
      {session.checks.length === 0 ? (
        <p className="break-words text-slate-900">
          <span className="text-sm text-slate-600">Cliente: </span>
          <span className="font-semibold">{session.customerName}</span>
        </p>
      ) : (
        <div role="radiogroup" aria-label="Comanda do pedido" className="flex flex-wrap gap-2">
          {session.checks.map((check) => {
            const active = check.id === activeId;
            return (
              <button
                key={check.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(check.id)}
                className={`flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${focusRing} ${
                  active
                    ? 'border-brand-700 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-800'
                }`}
              >
                <span className="min-w-0 break-words">{check.name}</span>
                {check.pending && (
                  <CloudOff aria-label="Aguardando envio" className="size-4 shrink-0 text-amber-800" />
                )}
              </button>
            );
          })}
        </div>
      )}
      {adding ? (
        <AddPersonForm
          session={session}
          onAdded={(checkId) => {
            onChange(checkId);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 ${focusRing}`}
        >
          <UserPlus aria-hidden className="size-5" />
          Adicionar pessoa
        </button>
      )}
    </div>
  );
}
