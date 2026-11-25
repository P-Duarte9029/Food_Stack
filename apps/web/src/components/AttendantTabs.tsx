import { useOutbox } from '../offline/outbox';
import { SubNav } from './SubNav';

export function AttendantTabs() {
  const waiting = useOutbox().length;
  const sent = location.hash === '#/atendente/enviados';

  return (
    <SubNav
      label="Seções do atendente"
      tabs={[
        { href: '#/atendente', label: 'Novo pedido', active: !sent },
        {
          href: '#/atendente/enviados',
          label: 'Pedidos enviados',
          active: sent,
          badge:
            waiting > 0 ? (
              <span
                className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950"
                aria-label={`${waiting} aguardando envio`}
              >
                {waiting}
              </span>
            ) : undefined,
        },
      ]}
    />
  );
}
