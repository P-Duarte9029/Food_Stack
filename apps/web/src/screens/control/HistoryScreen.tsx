import { useState } from 'react';
import { orderItemLabel } from '@food-stack/shared';
import { StatusBadge } from '../../components/StatusBadge';
import {
  filterByPeriod,
  groupByDay,
  isInvertedPeriod,
  localDayKey,
} from '../../orders/history-period';
import { useOrders } from '../../orders/orders-store';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const dateFieldClasses = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 ${focusRing}`;
const quickButtonClasses = `min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 ${focusRing}`;

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "AAAA-MM-DD" (dia local) para o cabeçalho do grupo. */
const formatDay = (day: string): string => {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return dayFormatter.format(new Date(year, month - 1, date));
};

const countLabel = (count: number): string => `${count} ${count === 1 ? 'pedido' : 'pedidos'}`;

export function HistoryScreen() {
  const orders = useOrders();
  const [from, setFrom] = useState(() => localDayKey(new Date()));
  const [to, setTo] = useState(() => localDayKey(new Date()));

  const inverted = isInvertedPeriod(from, to);
  const inPeriod = inverted ? [] : filterByPeriod(orders, from, to);
  const days = groupByDay(inPeriod);

  const showToday = () => {
    const today = localDayKey(new Date());
    setFrom(today);
    setTo(today);
  };

  return (
    <div className="p-4 lg:p-0">
      <section aria-labelledby="historico-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="historico-titulo" className="text-lg font-bold">
          Histórico de pedidos <span className="text-slate-600">({inPeriod.length})</span>
        </h2>

        <form
          aria-label="Período do histórico"
          onSubmit={(event) => event.preventDefault()}
          className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_auto] sm:items-end"
        >
          <div>
            <label htmlFor="historico-de" className="text-sm font-medium text-slate-700">
              De
            </label>
            <input
              id="historico-de"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className={dateFieldClasses}
            />
          </div>
          <div>
            <label htmlFor="historico-ate" className="text-sm font-medium text-slate-700">
              Até
            </label>
            <input
              id="historico-ate"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className={dateFieldClasses}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={showToday} className={quickButtonClasses}>
              Hoje
            </button>
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
              className={quickButtonClasses}
            >
              Todo o período
            </button>
          </div>
        </form>

        {inverted && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            A data inicial não pode ser depois da final. Ajuste o período.
          </p>
        )}

        {!inverted && days.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">
            {orders.length === 0
              ? 'Nenhum pedido registrado.'
              : 'Nenhum pedido neste período. Escolha outras datas ou use "Todo o período".'}
          </p>
        )}

        {days.map(({ day, orders: dayOrders }) => (
          <section key={day} aria-labelledby={`dia-${day}`} className="mt-5">
            <h3
              id={`dia-${day}`}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-300 pb-1 text-base font-bold capitalize text-slate-900"
            >
              {formatDay(day)}
              <span className="text-sm font-medium normal-case text-slate-600">
                {countLabel(dayOrders.length)}
              </span>
            </h3>
            <ul className="divide-y divide-slate-200">
              {dayOrders.map((order) => (
                <li key={order.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      Mesa {order.table}
                      {order.customerName && (
                        <span className="font-semibold text-slate-700"> · {order.customerName}</span>
                      )}
                      <span className="ml-2 text-sm font-normal text-slate-600">
                        {timeFormatter.format(new Date(order.createdAt))}
                      </span>
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 break-words text-sm text-slate-700">
                    {order.items.map((item) => `${item.quantity}x ${orderItemLabel(item)}`).join(', ')}
                  </p>
                  {order.notes && (
                    <p className="mt-1 break-words text-sm text-slate-700">
                      <span className="font-semibold">Obs.:</span> {order.notes}
                    </p>
                  )}
                  {order.createdByName && (
                    <p className="mt-1 break-words text-sm text-slate-600">
                      Atendente: {order.createdByName}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </div>
  );
}
