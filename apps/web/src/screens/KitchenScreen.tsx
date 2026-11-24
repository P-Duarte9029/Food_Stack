import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { Order, OrderStatus } from '@food-stack/shared';
import { StatusBadge } from '../components/StatusBadge';
import { advanceOrder, useOrders } from '../orders/orders-store';
import { ADVANCE_LABEL, STATUS_LABEL } from '../orders/status';
import { useElapsedMinutes } from '../orders/useElapsedMinutes';

const COLUMNS: readonly OrderStatus[] = ['placed', 'in_preparation', 'ready'];

function OrderCard({ order }: { order: Order }) {
  const minutes = useElapsedMinutes(order.createdAt);
  const [error, setError] = useState<string | null>(null);
  const action = order.status === 'ready' ? null : ADVANCE_LABEL[order.status];

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-slate-900">Mesa {order.table}</h3>
        <span className="flex items-center gap-1 text-sm text-slate-700">
          <Clock aria-hidden className="size-4" />
          {minutes} min
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-lg text-slate-900">
        {order.items.map((item) => (
          <li key={item.menuItemId} className="break-words">
            <span className="font-bold tabular-nums">{item.quantity}x</span> {item.name}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <StatusBadge status={order.status} />
        {action && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              advanceOrder(order.id).catch((failure: unknown) =>
                setError(failure instanceof Error ? failure.message : 'Falha ao atualizar o pedido.'),
              );
            }}
            className="min-h-12 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            {action}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </li>
  );
}

export function KitchenScreen() {
  const orders = useOrders();

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-3">
      {COLUMNS.map((status) => {
        const column = orders.filter((order) => order.status === status);
        return (
          <section key={status} aria-labelledby={`col-${status}`}>
            <h2 id={`col-${status}`} className="text-lg font-bold text-slate-900">
              {STATUS_LABEL[status]} <span className="text-slate-600">({column.length})</span>
            </h2>
            {column.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                Nenhum pedido.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {column.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
