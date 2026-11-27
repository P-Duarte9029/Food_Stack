import { orderItemLabel } from '@food-stack/shared';
import { StatusBadge } from '../../components/StatusBadge';
import { useOrders } from '../../orders/orders-store';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function HistoryScreen() {
  const orders = useOrders();
  const history = [...orders].reverse();

  return (
    <div className="p-4 lg:p-0">
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
                  {order.customerName && (
                    <span className="font-semibold text-slate-700"> · {order.customerName}</span>
                  )}
                  <span className="ml-2 text-sm font-normal text-slate-600">
                    {dateFormatter.format(new Date(order.createdAt))}
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
      )}
    </section>
    </div>
  );
}
