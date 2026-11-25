import { useEffect, useState, type FormEvent } from 'react';
import { Plus, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react';
import {
  MAX_TABLES,
  canonicalCategory,
  createMenuItemInputSchema,
  distinctCategories,
  sameCategory,
  tablesCountSchema,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { CONTROL_CONTAINER_WIDTH } from '../../components/layout';
import { setUnsavedChanges } from '../../navigation/unsaved-changes';
import { generateUuid } from '../../lib/uuid';
import {
  addMenuItem,
  removeMenuItem,
  setTablesCount,
  useMenu,
  useTablesCount,
} from '../../restaurant/restaurant-store';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const primaryButton = `flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 ${focusRing}`;

type MenuRow = MenuItem & { state: 'saved' | 'added' | 'removed' };

interface PendingItem extends CreateMenuItemInput {
  tempId: string;
}

function TablesSection({
  value,
  error,
  onChange,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <section aria-labelledby="mesas-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="mesas-titulo" className="text-lg font-bold">
        Mesas
      </h2>
      <div className="mt-3">
        <label htmlFor="mesas-qtd" className="text-sm font-medium text-slate-700">
          Quantidade de mesas
        </label>
        <input
          id="mesas-qtd"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_TABLES}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error ? 'mesas-erro' : undefined}
          className={fieldClasses}
        />
        {error && (
          <p id="mesas-erro" role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function MenuSection({
  rows,
  onAdd,
  onToggleRemoval,
  onDiscardAdded,
}: {
  rows: readonly MenuRow[];
  onAdd: (input: CreateMenuItemInput) => void;
  onToggleRemoval: (id: string) => void;
  onDiscardAdded: (tempId: string) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const categories = distinctCategories(rows.map((row) => row.category));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createMenuItemInputSchema.safeParse({ name, category });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    onAdd({ ...parsed.data, category: canonicalCategory(categories, parsed.data.category) });
    setName('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby="novo-prato-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="novo-prato-titulo" className="text-lg font-bold">
          Novo prato
        </h2>
        <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
          <div>
            <label htmlFor="prato-nome" className="text-sm font-medium text-slate-700">
              Nome do prato
            </label>
            <input
              id="prato-nome"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="prato-categoria" className="text-sm font-medium text-slate-700">
              Categoria
            </label>
            <input
              id="prato-categoria"
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={fieldClasses}
            />
            {categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Categorias existentes">
                {categories.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={sameCategory(category, option)}
                    onClick={() => setCategory(option)}
                    className={`min-h-11 max-w-full break-words rounded-full border px-3 text-sm font-medium ${focusRing} ${
                      sameCategory(category, option)
                        ? 'border-brand-700 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
            <Plus aria-hidden className="size-5" />
            Incluir prato
          </button>
        </form>
      </section>

      <section aria-labelledby="cardapio-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="cardapio-titulo" className="text-lg font-bold">
          Cardápio
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">Nenhum prato cadastrado.</p>
        ) : (
          categories.map((group) => (
            <div key={group} className="mt-4">
              <h3 className="break-words text-sm font-semibold uppercase tracking-wide text-slate-600">
                {group}
              </h3>
              <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                {rows
                  .filter((row) => sameCategory(row.category, group))
                  .map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 p-3">
                      <span className="min-w-0 break-words text-slate-900">
                        <span className={row.state === 'removed' ? 'text-slate-500 line-through' : ''}>
                          {row.name}
                        </span>
                        {row.state === 'added' && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                            Novo
                          </span>
                        )}
                        {row.state === 'removed' && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900">
                            Será removido
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={
                          row.state === 'removed'
                            ? `Manter ${row.name} no cardápio`
                            : row.state === 'added'
                              ? `Descartar ${row.name}`
                              : `Remover ${row.name} do cardápio`
                        }
                        onClick={() =>
                          row.state === 'added' ? onDiscardAdded(row.id) : onToggleRemoval(row.id)
                        }
                        className={`grid size-11 shrink-0 place-items-center rounded-lg border border-slate-300 ${focusRing} ${
                          row.state === 'removed' ? 'text-slate-800' : 'text-red-700'
                        }`}
                      >
                        {row.state === 'removed' ? (
                          <Undo2 aria-hidden className="size-5" />
                        ) : (
                          <Trash2 aria-hidden className="size-5" />
                        )}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export function TablesMenuScreen() {
  const menu = useMenu();
  const tablesCount = useTablesCount();

  const [tablesDraft, setTablesDraft] = useState<string | null>(null);
  const [added, setAdded] = useState<readonly PendingItem[]>([]);
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const tablesValue = tablesDraft ?? String(tablesCount ?? '');
  const parsedTables = tablesCountSchema.safeParse(Number(tablesValue));
  const tablesError =
    tablesDraft !== null && !parsedTables.success
      ? `Informe um número inteiro de 1 a ${MAX_TABLES}.`
      : null;
  const tablesChanged =
    tablesDraft !== null && parsedTables.success && parsedTables.data !== tablesCount;
  const removedIds = removed.filter((id) => menu.some((item) => item.id === id));

  const changes = (tablesChanged ? 1 : 0) + added.length + removedIds.length;
  const dirty = changes > 0 || tablesError !== null;
  const canSave = changes > 0 && tablesError === null && !saving;

  const rows: MenuRow[] = [
    ...menu.map(
      (item): MenuRow => ({
        ...item,
        state: removedIds.includes(item.id) ? 'removed' : 'saved',
      }),
    ),
    ...added.map(
      (item): MenuRow => ({
        id: item.tempId,
        name: item.name,
        category: item.category,
        state: 'added',
      }),
    ),
  ];

  useEffect(() => {
    setUnsavedChanges(dirty);
    return () => setUnsavedChanges(false);
  }, [dirty]);

  const touch = () => {
    setSaved(false);
    setSaveError(null);
  };

  const discardAll = () => {
    touch();
    setTablesDraft(null);
    setAdded([]);
    setRemoved([]);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (tablesChanged && parsedTables.success) {
        await setTablesCount(parsedTables.data);
        setTablesDraft(null);
      }
      for (const item of added) {
        await addMenuItem({ name: item.name, category: item.category });
        setAdded((current) => current.filter((entry) => entry.tempId !== item.tempId));
      }
      for (const id of removedIds) {
        await removeMenuItem(id);
        setRemoved((current) => current.filter((entry) => entry !== id));
      }
      setRemoved([]);
      setSaved(true);
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? `${failure.message} As alterações restantes continuam pendentes.`
          : 'Não foi possível salvar.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={dirty ? 'pb-28' : undefined}>
      {saved && (
        <p
          role="status"
          className="mx-4 mt-4 rounded-lg lg:mx-0 lg:mb-4 lg:mt-0 bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Alterações salvas.
        </p>
      )}
      {saveError && (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg lg:mx-0 lg:mb-4 lg:mt-0 bg-red-100 px-4 py-3 text-sm font-medium text-red-900"
        >
          {saveError}
        </p>
      )}
      <div className="space-y-4 p-4 lg:p-0">
        <TablesSection
          value={tablesValue}
          error={tablesError}
          onChange={(value) => {
            touch();
            setTablesDraft(value);
          }}
        />
        <div className="min-w-0">
          <MenuSection
            rows={rows}
            onAdd={(input) => {
              touch();
              setAdded((current) => [...current, { ...input, tempId: generateUuid() }]);
            }}
            onToggleRemoval={(id) => {
              touch();
              setRemoved((current) =>
                current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
              );
            }}
            onDiscardAdded={(tempId) => {
              touch();
              setAdded((current) => current.filter((entry) => entry.tempId !== tempId));
            }}
          />
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
          <div className={`mx-auto flex ${CONTROL_CONTAINER_WIDTH} flex-wrap items-center gap-3`}>
            <p role="status" className="min-w-0 flex-1 basis-48 text-sm text-slate-700">
              {changes === 0
                ? 'Corrija o número de mesas ou descarte para continuar.'
                : `${changes} ${changes === 1 ? 'alteração não salva' : 'alterações não salvas'}. Salve ou descarte para trocar de tela.`}
            </p>
            <button
              type="button"
              onClick={discardAll}
              disabled={saving}
              className={`flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 px-3 font-semibold text-slate-800 disabled:opacity-40 ${focusRing}`}
            >
              <RotateCcw aria-hidden className="size-5" />
              Descartar
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void save()}
              className={`flex min-h-12 items-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`}
            >
              <Save aria-hidden className="size-5" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
