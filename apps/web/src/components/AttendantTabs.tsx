import { useOutbox } from '../offline/outbox';

const TABS = [
  { href: '#/atendente', label: 'Novo pedido', current: (hash: string) => hash !== '#/atendente/enviados' },
  { href: '#/atendente/enviados', label: 'Pedidos enviados', current: (hash: string) => hash === '#/atendente/enviados' },
] as const;

export function AttendantTabs() {
  const waiting = useOutbox().length;

  return (
    <nav aria-label="Seções do atendente" className="flex gap-1 px-4 pt-4">
      {TABS.map(({ href, label, current }) => {
        const active = current(location.hash);
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg border px-2 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
              active
                ? 'border-brand-700 bg-brand-50 text-brand-700'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {label}
            {href.endsWith('enviados') && waiting > 0 && (
              <span
                className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950"
                aria-label={`${waiting} aguardando envio`}
              >
                {waiting}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
