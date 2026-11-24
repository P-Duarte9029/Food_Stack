import { useSyncExternalStore } from 'react';
import { ChefHat, ConciergeBell, type LucideIcon } from 'lucide-react';
import { KitchenScreen } from './screens/KitchenScreen';
import { WaiterScreen } from './screens/WaiterScreen';

type View = 'atendente' | 'cozinha';

const TABS: ReadonlyArray<{ view: View; label: string; icon: LucideIcon }> = [
  { view: 'atendente', label: 'Atendente', icon: ConciergeBell },
  { view: 'cozinha', label: 'Cozinha', icon: ChefHat },
];

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

const currentView = (): View => (location.hash === '#/cozinha' ? 'cozinha' : 'atendente');

export function App() {
  const view = useSyncExternalStore(subscribe, currentView);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="text-xl font-bold text-brand-600">Food Stack</h1>
          <nav aria-label="Telas" className="flex gap-1">
            {TABS.map(({ view: tabView, label, icon: Icon }) => (
              <a
                key={tabView}
                href={`#/${tabView}`}
                aria-current={view === tabView ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
                  view === tabView ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                }`}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl">
        {view === 'atendente' ? <WaiterScreen /> : <KitchenScreen />}
      </main>
    </div>
  );
}
