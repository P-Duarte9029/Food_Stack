import { Check } from 'lucide-react';
import type { Order, OrderStatus } from '@food-stack/shared';
import { AttendantTabs } from '../components/AttendantTabs';
import { useOrders } from '../orders/orders-store';
import { STATUS_LABEL } from '../orders/status';

const STEPS: readonly OrderStatus[] = ['placed', 'in_preparation', 'ready'];

function ProgressSteps({ status }: { status: OrderStatus }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="mt-3 flex items-start" aria-label="Andamento do pedido">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || status === 'ready';
        const current = index === currentIndex;
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
          >
            {index > 0 && (
              <span
                aria-hidden
                className={`absolute right-1/2 top-3.5 h-0.5 w-full ${
                  index <= currentIndex ? 'bg-brand-600' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`relative grid size-7 place-items-center rounded-full border-2 text-xs font-bold ${
                done
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : current
                    ? 'border-brand-600 bg-white text-brand-700'
                    : 'border-slate-300 bg-white text-slate-500'
              }`}
            >
              {done ? <Check aria-hidden className="size-4" /> : index + 1}
            </span>
            <span
              className={`text-xs ${current ? 'font-bold text-slate-900' : 'text-slate-600'}`}
            >
              {STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function SentOrderCard({ order }: { order: Order }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">Mesa {order.table}</h3>
        <span className="text-sm text-slate-600">
          {timeFormatter.format(new Date(order.createdAt))}
        </span>
      </div>
      <p className="mt-1 break-words text-sm text-slate-700">
        {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
      </p>
      <ProgressSteps status={order.status} />
    </li>
  );
}

export function SentOrdersScreen() {
  const orders = [...useOrders()].reverse();

  return (
    <div className="mx-auto max-w-md pb-8">
      <AttendantTabs />
      <section aria-labelledby="enviados-titulo" className="px-4 pt-6">
        <h2 id="enviados-titulo" className="text-lg font-bold text-slate-900">
          Pedidos enviados <span className="text-slate-600">({orders.length})</span>
        </h2>
        {orders.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            Nenhum pedido enviado ainda.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {orders.map((order) => (
              <SentOrderCard key={order.id} order={order} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
