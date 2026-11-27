import { useState, type FormEvent } from 'react';
import { CircleCheck, CirclePause, Pencil, Power, Users } from 'lucide-react';
import {
  MAX_TABLES,
  platformRestaurantSchema,
  updateRestaurantInputSchema,
  type PlatformRestaurant,
  type UpdateRestaurantInput,
} from '@food-stack/shared';
import { request } from '../../api/client';
import { TeamSection } from '../TeamSection';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const secondaryButton = `flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 disabled:opacity-40 ${focusRing}`;
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

type Mode = 'view' | 'edit' | 'confirm-toggle';

export function RestaurantRow({
  restaurant,
  onChanged,
}: {
  restaurant: PlatformRestaurant;
  onChanged: (restaurant: PlatformRestaurant) => void;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const [name, setName] = useState(restaurant.name);
  const [tables, setTables] = useState(String(restaurant.tablesCount));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTeam, setShowTeam] = useState(false);

  const send = async (changes: UpdateRestaurantInput) => {
    const parsed = updateRestaurantInputSchema.safeParse(changes);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onChanged(
        await request('PATCH', `/platform/restaurants/${restaurant.id}`, platformRestaurantSchema, parsed.data),
      );
      setMode('view');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    void send({ name, tablesCount: Number(tables) });
  };

  const startEdit = () => {
    setName(restaurant.name);
    setTables(String(restaurant.tablesCount));
    setError(null);
    setMode('edit');
  };

  return (
    <li className="py-4">
      {mode === 'edit' ? (
        <form onSubmit={save} noValidate className="space-y-3">
          <div>
            <label htmlFor={`nome-${restaurant.id}`} className="text-sm font-medium text-slate-700">
              Nome
            </label>
            <input
              id={`nome-${restaurant.id}`}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor={`mesas-${restaurant.id}`} className="text-sm font-medium text-slate-700">
              Quantidade de mesas
            </label>
            <input
              id={`mesas-${restaurant.id}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TABLES}
              value={tables}
              onChange={(event) => setTables(event.target.value)}
              className={fieldClasses}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 sm:flex-none ${focusRing}`}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" disabled={saving} onClick={() => setMode('view')} className={secondaryButton}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="break-words font-semibold text-slate-900">{restaurant.name}</h3>
              <p className="mt-0.5 text-sm text-slate-600">
                {restaurant.tablesCount} {restaurant.tablesCount === 1 ? 'mesa' : 'mesas'} · criado em{' '}
                {dateFormatter.format(new Date(restaurant.createdAt))}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                restaurant.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {restaurant.active ? (
                <CircleCheck aria-hidden className="size-3.5" />
              ) : (
                <CirclePause aria-hidden className="size-3.5" />
              )}
              {restaurant.active ? 'Ativo' : 'Desativado'}
            </span>
          </div>

          {mode === 'confirm-toggle' ? (
            <div className="mt-3">
              <p className="text-sm text-slate-800">
                {restaurant.active
                  ? 'Desativar encerra as sessões e bloqueia o login de todos os usuários deste restaurante. Os dados são mantidos.'
                  : 'Reativar permite que os usuários deste restaurante voltem a entrar.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void send({ active: !restaurant.active })}
                  className={`flex min-h-11 items-center gap-2 rounded-lg px-4 font-semibold text-white disabled:opacity-40 ${focusRing} ${
                    restaurant.active ? 'bg-red-700' : 'bg-brand-600'
                  }`}
                >
                  {saving ? 'Salvando...' : restaurant.active ? 'Confirmar desativação' : 'Confirmar reativação'}
                </button>
                <button type="button" disabled={saving} onClick={() => setMode('view')} className={secondaryButton}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                aria-expanded={showTeam}
                onClick={() => setShowTeam((current) => !current)}
                className={secondaryButton}
              >
                <Users aria-hidden className="size-4" />
                {showTeam ? 'Ocultar equipe' : 'Equipe'}
              </button>
              <button type="button" onClick={startEdit} className={secondaryButton}>
                <Pencil aria-hidden className="size-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('confirm-toggle');
                }}
                className={secondaryButton}
              >
                <Power aria-hidden className="size-4" />
                {restaurant.active ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {showTeam && mode !== 'confirm-toggle' && (
            <TeamSection basePath={`/platform/restaurants/${restaurant.id}/users`} embedded editable />
          )}
        </>
      )}
    </li>
  );
}
