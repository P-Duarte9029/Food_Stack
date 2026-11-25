import type { ReactNode } from 'react';

/**
 * Disposição das telas com seções: no desktop o menu fica numa coluna lateral e o
 * conteúdo ao lado; no mobile o menu fica no topo, acima do conteúdo.
 */
export function SectionLayout({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:p-4">
      {nav}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
