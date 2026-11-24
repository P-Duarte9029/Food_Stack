import { useState } from 'react';
import { Minus, Plus, Send } from 'lucide-react';
import { useMenu, useMenuLoaded, useTablesCount } from '../restaurant/restaurant-store';
import { AttendantTabs } from '../components/AttendantTabs';
import { submitOrder, type SubmitResult } from '../offline/outbox';
import { useIsConnected } from '../realtime/socket';

type Quantities = Readonly<Record<string, number>>;

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';

export function WaiterScreen() {
  const [table, setTable] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Quantities>({});
  const [sentTable, setSentTable] = useState<number | null>(null);
  const [sentResult, setSentResult] = useState<SubmitResult>('sent');
  const connected = useIsConnected();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menu = useMenu();
  const menuLoaded = useMenuLoaded();
  const tablesCount = useTablesCount();
  const tables = Array.from({ length: tablesCount ?? 0 }, (_, index) => index + 1);
  const categories = [...new Set(menu.map((item) => item.category))];

  const selected = menu.filter((item) => (quantities[item.id] ?? 0) > 0);
  const totalUnits = selected.reduce((sum, item) => sum + (quantities[item.id] ?? 0), 0);
  const canSend = table !== null && totalUnits > 0;

  const change = (id: string, delta: number) =>
    setQuantities((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));

  const send = async () => {
    if (table === null || totalUnits === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await submitOrder({
        table,
        items: selected.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          quantity: quantities[item.id] ?? 0,
        })),
      });
      setSentTable(table);
      setSentResult(result);
      setTable(null);
      setQuantities({});
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível enviar o pedido.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pb-28">
      <AttendantTabs />
      {error && (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-900"
        >
          {error}
        </p>
      )}
      {sentTable !== null && (
        <p
          role="status"
          className={`mx-4 mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
            sentResult === 'sent' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {sentResult === 'sent'
            ? `Pedido da mesa ${sentTable} enviado para a cozinha.`
            : `Sem conexão. O pedido da mesa ${sentTable} foi salvo e será enviado ao reconectar.`}{' '}
          <a href="#/atendente/enviados" className="underline">
            Acompanhar
          </a>
        </p>
      )}

      <section aria-labelledby="mesa-titulo" className="px-4 pt-6">
        <h2 id="mesa-titulo" className="text-lg font-bold text-slate-900">
          1. Mesa
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {tables.map((number) => (
            <button
              key={number}
              type="button"
              aria-pressed={table === number}
              onClick={() => {
                setTable(number);
                setSentTable(null);
              }}
              className={`min-h-12 rounded-lg border text-lg font-semibold ${focusRing} ${
                table === number
                  ? 'border-brand-700 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-900 active:bg-slate-100'
              }`}
            >
              {number}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="itens-titulo" className="px-4 pt-8">
        <h2 id="itens-titulo" className="text-lg font-bold text-slate-900">
          2. Itens
        </h2>
        {menuLoaded && categories.length === 0 && (
          <p className="mt-2 text-sm text-slate-600">
            Cardápio vazio. Cadastre pratos na tela Controle.
          </p>
        )}
        {categories.map((category) => (
          <div key={category} className="mt-4">
            <h3 className="break-words text-sm font-semibold uppercase tracking-wide text-slate-600">
              {category}
            </h3>
            <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {menu.filter((item) => item.category === category).map((item) => {
                const quantity = quantities[item.id] ?? 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 p-3">
                    <span className="min-w-0 break-words text-slate-900">{item.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Remover ${item.name}`}
                        disabled={quantity === 0}
                        onClick={() => change(item.id, -1)}
                        className={`grid size-11 place-items-center rounded-lg border border-slate-300 text-slate-900 disabled:opacity-40 ${focusRing}`}
                      >
                        <Minus aria-hidden className="size-5" />
                      </button>
                      <span
                        aria-live="polite"
                        className="w-6 text-center text-lg font-semibold tabular-nums"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Adicionar ${item.name}`}
                        onClick={() => change(item.id, 1)}
                        className={`grid size-11 place-items-center rounded-lg bg-brand-600 text-white active:bg-brand-700 ${focusRing}`}
                      >
                        <Plus aria-hidden className="size-5" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <p className="flex-1 text-sm text-slate-700">
            {table === null ? 'Escolha uma mesa' : `Mesa ${table}`}
            <br />
            {totalUnits} {totalUnits === 1 ? 'item' : 'itens'}
            {!connected && <span className="block text-amber-800">Offline: será enviado ao reconectar</span>}
          </p>
          <button
            type="button"
            disabled={!canSend || sending}
            onClick={() => void send()}
            className={`flex min-h-12 items-center gap-2 rounded-lg bg-brand-600 px-5 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 ${focusRing}`}
          >
            <Send aria-hidden className="size-5" />
            Enviar pedido
          </button>
        </div>
      </div>
    </div>
  );
}
