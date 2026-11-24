import { useState, type FormEvent } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { MAX_TABLES, createMenuItemInputSchema, tablesCountSchema } from '@food-stack/shared';
import { StatusBadge } from '../components/StatusBadge';
import { useOrders } from '../orders/orders-store';
import {
  addMenuItem,
  removeMenuItem,
  setTablesCount,
  useMenu,
  useTablesCount,
} from '../restaurant/restaurant-store';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const fieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const primaryButton = `flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 ${focusRing}`;
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function TablesSection() {
  const tablesCount = useTablesCount();
  const [value, setValue] = useState(String(tablesCount));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = tablesCountSchema.safeParse(Number(value));
    if (!parsed.success) {
      setError(`Informe um número inteiro de 1 a ${MAX_TABLES}.`);
      setSaved(false);
      return;
    }
    setTablesCount(parsed.data);
    setError(null);
    setSaved(true);
  };

  return (
    <section aria-labelledby="mesas-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="mesas-titulo" className="text-lg font-bold">
        Mesas
      </h2>
      <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
        <div>
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
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
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
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
          <Save aria-hidden className="size-5" />
          Salvar
        </button>
        {saved && (
          <p role="status" className="text-sm font-medium text-emerald-800">
            Salvo: {tablesCount} {tablesCount === 1 ? 'mesa' : 'mesas'}.
          </p>
        )}
      </form>
    </section>
  );
}

function MenuSection() {
  const menu = useMenu();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const categories = [...new Set(menu.map((item) => item.category))];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createMenuItemInputSchema.safeParse({ name, category });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    addMenuItem(parsed.data);
    setName('');
    setError(null);
  };

  return (
    <section aria-labelledby="cardapio-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="cardapio-titulo" className="text-lg font-bold">
        Cardápio
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
                  aria-pressed={category.trim() === option}
                  onClick={() => setCategory(option)}
                  className={`min-h-11 rounded-full border px-3 text-sm font-medium ${focusRing} ${
                    category.trim() === option
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
          Adicionar prato
        </button>
      </form>

      {menu.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Nenhum prato cadastrado.</p>
      ) : (
        categories.map((group) => (
          <div key={group} className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{group}</h3>
            <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {menu
                .filter((item) => item.category === group)
                .map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 p-3">
                    <span className="min-w-0 text-slate-900">{item.name}</span>
                    <button
                      type="button"
                      aria-label={`Remover ${item.name} do cardápio`}
                      onClick={() => removeMenuItem(item.id)}
                      className={`grid size-11 shrink-0 place-items-center rounded-lg border border-slate-300 text-red-700 ${focusRing}`}
                    >
                      <Trash2 aria-hidden className="size-5" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function HistorySection() {
  const orders = useOrders();
  const history = [...orders].reverse();

  return (
    <section aria-labelledby="historico-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="historico-titulo" className="text-lg font-bold">
        Histórico de pedidos <span className="text-slate-600">({history.length})</span>
      </h2>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Nenhum pedido registrado.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200">
          {history.map((order) => (
            <li key={order.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">
                  Mesa {order.table}
                  <span className="ml-2 text-sm font-normal text-slate-600">
                    {dateFormatter.format(new Date(order.createdAt))}
                  </span>
                </p>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ControlScreen() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 md:items-start">
      <TablesSection />
      <MenuSection />
      <div className="md:col-span-2">
        <HistorySection />
      </div>
    </div>
  );
}
