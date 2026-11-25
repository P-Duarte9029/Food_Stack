import type { ReactNode } from 'react';
import { useHasUnsavedChanges } from '../navigation/unsaved-changes';

export interface SubNavTab {
  href: string;
  label: string;
  active: boolean;
  badge?: ReactNode;
}

export function SubNav({
  label,
  tabs,
  sidebarOnDesktop = false,
}: {
  label: string;
  tabs: readonly SubNavTab[];
  sidebarOnDesktop?: boolean;
}) {
  const locked = useHasUnsavedChanges();

  return (
    <nav
      aria-label={label}
      className={`flex gap-1 px-4 pt-4 ${sidebarOnDesktop ? 'lg:sticky lg:top-24 lg:flex-col lg:p-0' : ''}`}
    >
      {tabs.map(({ href, label: tabLabel, active, badge }) => {
        const blocked = locked && !active;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-disabled={blocked || undefined}
            onClick={blocked ? (event) => event.preventDefault() : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg border px-2 text-center text-sm font-semibold ${sidebarOnDesktop ? 'lg:flex-none lg:justify-start lg:px-4 lg:text-left' : ''} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
              active
                ? 'border-brand-700 bg-brand-50 text-brand-700'
                : 'border-slate-300 bg-white text-slate-700'
            } ${blocked ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            {tabLabel}
            {badge}
          </a>
        );
      })}
    </nav>
  );
}
