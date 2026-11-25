import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import {
  MAX_TABLES,
  MIN_PASSWORD_LENGTH,
  createRestaurantInputSchema,
  platformRestaurantSchema,
  type PlatformRestaurant,
} from '@food-stack/shared';
import { request } from '../../api/client';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const labelClasses = 'text-sm font-medium text-slate-700';

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

export function NewRestaurantForm({ onCreated }: { onCreated: (restaurant: PlatformRestaurant) => void }) {
  const [name, setName] = useState('');
  const [tables, setTables] = useState('12');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = createRestaurantInputSchema.safeParse({
      name,
      tablesCount: Number(tables),
      manager: { name: managerName, email: managerEmail, password: managerPassword },
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      setCreated(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const restaurant = await request('POST', '/platform/restaurants', platformRestaurantSchema, parsed.data);
      onCreated(restaurant);
      setCreated(restaurant.name);
      setName('');
      setManagerName('');
      setManagerEmail('');
      setManagerPassword('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível criar o restaurante.');
      setCreated(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="novo-restaurante-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="novo-restaurante-titulo" className="text-lg font-bold">
        Novo restaurante
      </h2>
      {created && (
        <p role="status" className="mt-3 text-sm font-medium text-emerald-800">
          {created} criado. O gerente já pode entrar com o e-mail e a senha informados.
        </p>
      )}
      <form onSubmit={(event) => void submit(event)} noValidate className="mt-3 space-y-3">
        <Field id="rest-nome" label="Nome do restaurante">
          <input
            id="rest-nome"
            type="text"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClasses}
          />
        </Field>
        <Field id="rest-mesas" label="Quantidade de mesas">
          <input
            id="rest-mesas"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TABLES}
            value={tables}
            onChange={(event) => setTables(event.target.value)}
            className={fieldClasses}
          />
        </Field>

        <fieldset className="space-y-3 border-t border-slate-200 pt-3">
          <legend className="text-sm font-semibold text-slate-900">Primeiro gerente</legend>
          <Field id="ger-nome" label="Nome">
            <input
              id="ger-nome"
              type="text"
              autoComplete="off"
              value={managerName}
              onChange={(event) => setManagerName(event.target.value)}
              className={fieldClasses}
            />
          </Field>
          <Field id="ger-email" label="E-mail">
            <input
              id="ger-email"
              type="email"
              autoComplete="off"
              value={managerEmail}
              onChange={(event) => setManagerEmail(event.target.value)}
              className={fieldClasses}
            />
          </Field>
          <Field
            id="ger-senha"
            label="Senha inicial"
            hint={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres. Informe ao gerente por um canal seguro.`}
          >
            <input
              id="ger-senha"
              type="password"
              autoComplete="new-password"
              value={managerPassword}
              onChange={(event) => setManagerPassword(event.target.value)}
              className={fieldClasses}
            />
          </Field>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 sm:w-auto ${focusRing}`}
        >
          <Plus aria-hidden className="size-5" />
          {saving ? 'Criando...' : 'Criar restaurante'}
        </button>
      </form>
    </section>
  );
}
