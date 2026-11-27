import { useState } from 'react';
import { Check, CloudOff, PackageCheck, RotateCw, TriangleAlert, X } from 'lucide-react';
import { orderItemLabel, type Order, type OrderStatus } from '@food-stack/shared';
import { AttendantTabs } from '../components/AttendantTabs';
import { SectionLayout } from '../components/SectionLayout';
import { discardQueued, retryQueued, useOutbox, type QueuedEntry } from '../offline/outbox';
import { useAuth } from '../auth/auth-store';
import { canDeliverOrder } from '../orders/delivery-rule';
import { deliverOrder, useOrders } from '../orders/orders-store';
import { STATUS_LABEL } from '../orders/status';
import { useOpenTables, type OpenTable } from '../table-sessions/use-open-tables';

const STEPS: readonly OrderStatus[] = ['placed', 'in_preparation', 'ready', 'delivered'];

function ProgressSteps({ status }: { status: OrderStatus }) {
  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="mt-3 flex items-start" aria-label="Andamento do pedido">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || status === 'delivered';
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
              className={`relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-bold ${
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
  const { user } = useAuth();
  const [delivering, setDelivering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDeliver = canDeliverOrder(order, user);

  const deliver = async () => {
    setDelivering(true);
    setError(null);
    try {
      await deliverOrder(order.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível marcar como entregue.');
      setDelivering(false);
    }
  };

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 break-words text-lg font-bold text-slate-900">
          Mesa {order.table}
          {order.customerName && (
            <span className="font-semibold text-slate-700"> · {order.customerName}</span>
          )}
        </h3>
        <span className="shrink-0 text-sm text-slate-600">
          {timeFormatter.format(new Date(order.createdAt))}
        </span>
      </div>
      <p className="mt-1 break-words text-sm text-slate-700">
        {order.items.map((item) => `${item.quantity}x ${orderItemLabel(item)}`).join(', ')}
      </p>
      {order.notes && (
        <p className="mt-1 break-words text-sm text-slate-700">
          <span className="font-semibold">Obs.:</span> {order.notes}
        </p>
      )}
      <ProgressSteps status={order.status} />
      {canDeliver && (
        <button
          type="button"
          disabled={delivering}
          onClick={() => void deliver()}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white active:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <PackageCheck aria-hidden className="size-5" />
          {delivering ? 'Marcando...' : 'Marcar como entregue'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </li>
  );
}

function describeQueued(
  entry: QueuedEntry,
  openTables: readonly OpenTable[],
): { table: number | undefined; customerName: string | undefined; summary: string } {
  switch (entry.kind) {
    case 'open_table':
      return { table: entry.input.table, customerName: entry.input.customerName, summary: 'Abertura de mesa' };
    case 'add_check':
      return {
        table: openTables.find((open) => open.id === entry.input.tableSessionId)?.table,
        customerName: entry.input.name,
        summary: 'Nova comanda',
      };
    case 'order': {
      const session = openTables.find((open) => open.id === entry.input.tableSessionId);
      const check = session?.checks.find((candidate) => candidate.id === entry.input.checkId);
      return {
        table: entry.input.table,
        customerName: check?.name ?? session?.customerName,
        summary: entry.input.items.map((item) => `${item.quantity}x ${orderItemLabel(item)}`).join(', '),
      };
    }
  }
}

function QueuedCard({ entry }: { entry: QueuedEntry }) {
  const openTables = useOpenTables();
  const failed = entry.status === 'failed';
  const { table, customerName, summary } = describeQueued(entry, openTables);

  return (
    <li
      className={`rounded-xl border p-4 ${
        failed ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 break-words text-lg font-bold text-slate-900">
          {table === undefined ? 'Mesa' : `Mesa ${table}`}
          {customerName && <span className="font-semibold text-slate-700"> · {customerName}</span>}
        </h3>
        <span className="shrink-0 text-sm text-slate-700">
          {timeFormatter.format(new Date(entry.queuedAt))}
        </span>
      </div>
      <p className="mt-1 break-words text-sm text-slate-800">{summary}</p>
      <p
        className={`mt-3 flex items-start gap-1.5 text-sm font-semibold ${
          failed ? 'text-red-900' : 'text-amber-900'
        }`}
      >
        {failed ? (
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        ) : (
          <CloudOff aria-hidden className="mt-0.5 size-4 shrink-0" />
        )}
        <span className="break-words">
          {failed ? `Não enviado: ${entry.error ?? 'recusado pelo servidor'}` : 'Aguardando conexão para enviar'}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {failed && (
          <button
            type="button"
            onClick={() => retryQueued(entry.input.id)}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            <RotateCw aria-hidden className="size-4" />
            Tentar novamente
          </button>
        )}
        <button
          type="button"
          onClick={() => discardQueued(entry.input.id)}
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <X aria-hidden className="size-4" />
          {failed ? 'Descartar' : 'Cancelar envio'}
        </button>
      </div>
    </li>
  );
}

export function SentOrdersScreen() {
  const orders = useOrders()
    .filter((order) => order.status !== 'delivered')
    .reverse();
  const queued = [...useOutbox()].reverse();

  return (
    <div className="mx-auto max-w-md pb-8 lg:max-w-none">
      <SectionLayout nav={<AttendantTabs />}>
        {queued.length > 0 && (
          <section aria-labelledby="fila-titulo" className="px-4 pt-6 lg:p-0">
            <h2 id="fila-titulo" className="text-lg font-bold text-slate-900">
              Aguardando envio <span className="text-slate-600">({queued.length})</span>
            </h2>
            <ul className="mt-3 grid gap-3 lg:grid-cols-2 lg:items-start">
              {queued.map((entry) => (
                <QueuedCard key={entry.input.id} entry={entry} />
              ))}
            </ul>
          </section>
        )}

        <section
          aria-labelledby="enviados-titulo"
          className={`px-4 pt-6 lg:px-0 lg:pt-0 ${queued.length > 0 ? 'lg:mt-6' : ''}`}
        >
          <h2 id="enviados-titulo" className="text-lg font-bold text-slate-900">
            Pedidos enviados <span className="text-slate-600">({orders.length})</span>
          </h2>
          {orders.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              Nenhum pedido enviado ainda.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3 lg:grid-cols-2 lg:items-start">
              {orders.map((order) => (
                <SentOrderCard key={order.id} order={order} />
              ))}
            </ul>
          )}
        </section>
      </SectionLayout>
    </div>
  );
}
