import { useState } from 'react';
import { Minus, Plus, Send } from 'lucide-react';
import { distinctCategories, orderItemLabel, sameCategory } from '@food-stack/shared';
import { useMenu, useMenuLoaded, useTablesCount } from '../restaurant/restaurant-store';
import { CategoryAccordion } from '../components/CategoryAccordion';
import { AttendantTabs } from '../components/AttendantTabs';
import { SectionLayout } from '../components/SectionLayout';
import { menuLines } from '../orders/order-lines';
import { submitOrder, type SubmitResult } from '../offline/outbox';
import { useIsConnected } from '../realtime/socket';
import { useOpenTables } from '../table-sessions/use-open-tables';
import { TableSessionPanel } from './waiter/TableSessionPanel';

type Quantities = Readonly<Record<string, number>>;

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';

export function WaiterScreen() {
  const [table, setTable] = useState<number | null>(null);
  const [checkId, setCheckId] = useState<string | null>(null);
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
  const categories = distinctCategories(menu.map((item) => item.category));
  const openTables = useOpenTables();
  const session = openTables.find((open) => open.table === table);
  const activeCheck = session?.checks.find((check) => check.id === checkId) ?? session?.checks[0];

  const selected = menu.flatMap(menuLines).filter((line) => (quantities[line.key] ?? 0) > 0);
  const totalUnits = selected.reduce((sum, line) => sum + (quantities[line.key] ?? 0), 0);
  const canSend = session !== undefined && totalUnits > 0;

  const change = (key: string, delta: number) =>
    setQuantities((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) }));

  const send = async () => {
    if (table === null || !session || totalUnits === 0 || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await submitOrder({
        table,
        tableSessionId: session.id,
        checkId: activeCheck?.id,
        items: selected.map((line) => ({
          menuItemId: line.menuItemId,
          name: line.name,
          size: line.size,
          quantity: quantities[line.key] ?? 0,
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
    <div className="mx-auto max-w-md pb-28 lg:max-w-none">
      <SectionLayout nav={<AttendantTabs />}>
        {error && (
          <p
            role="alert"
            className="mx-4 mt-4 rounded-lg lg:mx-0 lg:mb-4 lg:mt-0 bg-red-100 px-4 py-3 text-sm font-medium text-red-900"
          >
            {error}
          </p>
        )}
        {sentTable !== null && (
          <p
            role="status"
            className={`mx-4 mt-4 rounded-lg lg:mx-0 lg:mb-4 lg:mt-0 px-4 py-3 text-sm font-medium ${
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

        <section aria-labelledby="mesa-titulo" className="px-4 pt-6 lg:p-0">
          <h2 id="mesa-titulo" className="text-lg font-bold text-slate-900">
            1. Mesa
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-8">
            {tables.map((number) => {
              const occupant = openTables.find((open) => open.table === number);
              const extraPeople = occupant ? Math.max(0, occupant.checks.length - 1) : 0;
              return (
                <button
                  key={number}
                  type="button"
                  aria-pressed={table === number}
                  aria-label={
                    occupant
                      ? `Mesa ${number}, ocupada por ${occupant.checks[0]?.name ?? occupant.customerName}${extraPeople > 0 ? ` e mais ${extraPeople}` : ''}`
                      : `Mesa ${number}, livre`
                  }
                  onClick={() => {
                    setTable(number);
                    setSentTable(null);
                  }}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center rounded-lg border px-1 font-semibold ${focusRing} ${
                    table === number
                      ? 'border-brand-700 bg-brand-600 text-white'
                      : occupant
                        ? 'border-brand-600 bg-brand-50 text-brand-700 active:bg-brand-100'
                        : 'border-slate-300 bg-white text-slate-900 active:bg-slate-100'
                  }`}
                >
                  <span className="text-lg leading-tight">{number}</span>
                  {occupant && (
                    <span className="max-w-full truncate text-xs font-medium leading-tight">
                      {occupant.checks[0]?.name ?? occupant.customerName}
                      {extraPeople > 0 && ` +${extraPeople}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {table !== null && (
            <TableSessionPanel
              table={table}
              session={session}
              activeCheck={activeCheck}
              onCheckChange={setCheckId}
            />
          )}
        </section>

        <section aria-labelledby="itens-titulo" className="px-4 pt-8 lg:px-0">
          <h2 id="itens-titulo" className="text-lg font-bold text-slate-900">
            2. Itens
          </h2>
          {menuLoaded && categories.length === 0 && (
            <p className="mt-2 text-sm text-slate-600">
              Cardápio vazio. Cadastre pratos na tela Controle.
            </p>
          )}
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
            {categories.map((category) => {
              const categoryLines = menu
                .filter((item) => sameCategory(item.category, category))
                .flatMap(menuLines);
              const categoryUnits = categoryLines.reduce(
                (sum, line) => sum + (quantities[line.key] ?? 0),
                0,
              );
              return (
                <CategoryAccordion
                  key={category}
                  title={category}
                  badge={
                    categoryUnits > 0
                      ? `${categoryUnits} ${categoryUnits === 1 ? 'item' : 'itens'}`
                      : undefined
                  }
                >
                  {categoryLines.map((line) => {
                    const quantity = quantities[line.key] ?? 0;
                    const label = orderItemLabel(line);
                    return (
                      <li key={line.key} className="flex items-center justify-between gap-3 p-3">
                        <span className="min-w-0 break-words text-slate-900">
                          {line.name}
                          {line.size && (
                            <span className="block text-sm font-medium text-slate-600">{line.size}</span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Remover ${label}`}
                            disabled={quantity === 0}
                            onClick={() => change(line.key, -1)}
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
                            aria-label={`Adicionar ${label}`}
                            onClick={() => change(line.key, 1)}
                            className={`grid size-11 place-items-center rounded-lg bg-brand-600 text-white active:bg-brand-700 ${focusRing}`}
                          >
                            <Plus aria-hidden className="size-5" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </CategoryAccordion>
              );
            })}
          </div>
        </section>

      </SectionLayout>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
        <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-7xl lg:px-4">
          <p className="flex-1 text-sm text-slate-700">
            {table === null
              ? 'Escolha uma mesa'
              : session
                ? `Mesa ${table} · ${activeCheck?.name ?? session.customerName}`
                : `Mesa ${table} · abra a mesa para enviar`}
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
