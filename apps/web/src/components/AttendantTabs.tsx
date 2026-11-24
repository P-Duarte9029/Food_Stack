const TABS = [
  { href: '#/atendente', label: 'Novo pedido', current: (hash: string) => hash !== '#/atendente/enviados' },
  { href: '#/atendente/enviados', label: 'Pedidos enviados', current: (hash: string) => hash === '#/atendente/enviados' },
] as const;

export function AttendantTabs() {
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
          </a>
        );
      })}
    </nav>
  );
}
