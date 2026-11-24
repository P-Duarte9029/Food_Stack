import { useSyncExternalStore } from 'react';
import { useHasUnsavedChanges } from './navigation/unsaved-changes';
import { useIsConnected } from './realtime/socket';
import { ChefHat, ConciergeBell, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { ControlScreen } from './screens/ControlScreen';
import { KitchenScreen } from './screens/KitchenScreen';
import { SentOrdersScreen } from './screens/SentOrdersScreen';
import { WaiterScreen } from './screens/WaiterScreen';

type View = 'atendente' | 'cozinha' | 'controle';

const TABS: ReadonlyArray<{ view: View; label: string; icon: LucideIcon }> = [
  { view: 'atendente', label: 'Atendente', icon: ConciergeBell },
  { view: 'cozinha', label: 'Cozinha', icon: ChefHat },
  { view: 'controle', label: 'Controle', icon: SlidersHorizontal },
];

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

const viewFrom = (hash: string): View => {
  if (hash === '#/cozinha') return 'cozinha';
  if (hash === '#/controle') return 'controle';
  return 'atendente';
};

export function App() {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  const view = viewFrom(hash);
  const connected = useIsConnected();
  const locked = useHasUnsavedChanges();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="text-xl font-bold text-brand-600">Food Stack</h1>
          <nav aria-label="Telas" className="flex w-full gap-1 sm:w-auto">
            {TABS.map(({ view: tabView, label, icon: Icon }) => {
              const blocked = locked && view !== tabView;
              return (
                <a
                  key={tabView}
                  href={`#/${tabView}`}
                  aria-current={view === tabView ? 'page' : undefined}
                  aria-disabled={blocked || undefined}
                  onClick={blocked ? (event) => event.preventDefault() : undefined}
                  className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 text-sm font-semibold sm:flex-none sm:gap-2 sm:px-3 sm:text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
                    view === tabView ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                  } ${blocked ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </a>
              );
            })}
          </nav>
        </div>
      </header>
      {!connected && (
        <p
          role="status"
          className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900"
        >
          Sem conexão com o servidor. Tentando reconectar...
        </p>
      )}
      <main className="mx-auto max-w-5xl">
        {view === 'atendente' &&
          (hash === '#/atendente/enviados' ? <SentOrdersScreen /> : <WaiterScreen />)}
        {view === 'cozinha' && <KitchenScreen />}
        {view === 'controle' && <ControlScreen />}
      </main>
    </div>
  );
}
