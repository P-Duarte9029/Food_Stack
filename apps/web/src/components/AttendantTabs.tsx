import { useAuth } from '../auth/auth-store';
import { useOutbox } from '../offline/outbox';
import { countReadyToDeliver } from '../orders/delivery-rule';
import { useOrders } from '../orders/orders-store';
import { SubNav } from './SubNav';

export function AttendantTabs() {
  const waiting = useOutbox().length;
  const { user } = useAuth();
  const ready = countReadyToDeliver(useOrders(), user);
  const sent = location.hash === '#/atendente/enviados';

  return (
    <SubNav
      sidebarOnDesktop
      label="Seções do atendente"
      tabs={[
        { href: '#/atendente', label: 'Novo pedido', active: !sent },
        {
          href: '#/atendente/enviados',
          label: 'Pedidos enviados',
          active: sent,
          badge: (
            <>
              {ready > 0 && (
                <span
                  className="ml-2 rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-950"
                  aria-label={`${ready} ${ready === 1 ? 'pedido pronto' : 'pedidos prontos'} para entregar`}
                >
                  {ready}
                </span>
              )}
              {waiting > 0 && (
                <span
                  className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950"
                  aria-label={`${waiting} aguardando envio`}
                >
                  {waiting}
                </span>
              )}
            </>
          ),
        },
      ]}
    />
  );
}
