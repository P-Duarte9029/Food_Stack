import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function CategoryAccordion({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mt-4">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <span className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-slate-700">
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {badge && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                {badge}
              </span>
            )}
            <ChevronDown
              aria-hidden
              className={`size-5 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
      </h3>
      <ul
        id={panelId}
        hidden={!open}
        className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white"
      >
        {children}
      </ul>
    </div>
  );
}
