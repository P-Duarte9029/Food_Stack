import { useEffect, useSyncExternalStore } from 'react';
import { ChefHat, ConciergeBell, LogOut, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { ROLE_LABEL, type SessionUser } from '@food-stack/shared';
import { logout, useAuth } from './auth/auth-store';
import { canAccess, homeScreenOf, screenFromHash, type Screen } from './auth/permissions';
import { useHasUnsavedChanges } from './navigation/unsaved-changes';
import { useOutbox } from './offline/outbox';
import './orders/ready-notifications';
import { useIsConnected } from './realtime/socket';
import { CONTAINER_WIDTH } from './components/layout';
import { NoticeToasts } from './components/NoticeToasts';
import { ControlScreen } from './screens/ControlScreen';
import { KitchenScreen } from './screens/KitchenScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SentOrdersScreen } from './screens/SentOrdersScreen';
import { WaiterScreen } from './screens/WaiterScreen';

const TABS: ReadonlyArray<{ screen: Screen; label: string; icon: LucideIcon }> = [
  { screen: 'atendente', label: 'Atendente', icon: ConciergeBell },
  { screen: 'cozinha', label: 'Cozinha', icon: ChefHat },
  { screen: 'controle', label: 'Controle', icon: SlidersHorizontal },
];

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

function Shell({ user }: { user: SessionUser }) {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  const screen = screenFromHash(hash);
  const allowed = canAccess(user.role, screen);
  const connected = useIsConnected();
  const locked = useHasUnsavedChanges();
  const waitingToSend = useOutbox().length > 0;
  const tabs = TABS.filter((tab) => canAccess(user.role, tab.screen));

  useEffect(() => {
    if (!allowed || hash === '') location.replace(`#/${homeScreenOf(user.role)}`);
  }, [allowed, hash, user.role]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className={`mx-auto flex ${CONTAINER_WIDTH} flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3`}>
          <h1 className="text-xl font-bold text-brand-600">Food Stack</h1>
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-right text-sm text-slate-700">
              <span className="font-semibold">{user.name}</span>
              <span className="text-slate-600"> · {ROLE_LABEL[user.role]}</span>
            </p>
            <button
              type="button"
              disabled={locked || waitingToSend || !connected}
              title={
                waitingToSend
                  ? 'Há pedidos aguardando envio'
                  : !connected
                    ? 'Sem conexão com o servidor'
                    : undefined
              }
              onClick={() => void logout().catch(() => undefined)}
              className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              <LogOut aria-hidden className="size-4" />
              Sair
            </button>
          </div>
          {tabs.length > 1 && (
            <nav aria-label="Telas" className="flex w-full gap-1 sm:w-auto">
              {tabs.map(({ screen: tabScreen, label, icon: Icon }) => {
                const blocked = locked && screen !== tabScreen;
                return (
                  <a
                    key={tabScreen}
                    href={`#/${tabScreen}`}
                    aria-current={screen === tabScreen ? 'page' : undefined}
                    aria-disabled={blocked || undefined}
                    onClick={blocked ? (event) => event.preventDefault() : undefined}
                    className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 text-sm font-semibold sm:flex-none sm:gap-2 sm:px-3 sm:text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
                      screen === tabScreen ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                    } ${blocked ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <Icon aria-hidden className="size-5" />
                    {label}
                  </a>
                );
              })}
            </nav>
          )}
        </div>
      </header>
      {!connected && (
        <p
          role="status"
          className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900"
        >
          Sem conexão com o servidor. Tentando reconectar...
          {waitingToSend && ' Pedidos pendentes serão enviados ao reconectar.'}
        </p>
      )}
      {allowed && screen === 'atendente' && <NoticeToasts />}
      <main className={`mx-auto ${CONTAINER_WIDTH}`}>
        {allowed && screen === 'atendente' &&
          (hash === '#/atendente/enviados' ? <SentOrdersScreen /> : <WaiterScreen />)}
        {allowed && screen === 'cozinha' && <KitchenScreen />}
        {allowed && screen === 'controle' && <ControlScreen />}
      </main>
    </div>
  );
}

export function App() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <p role="status" className="grid min-h-screen place-items-center text-slate-600">
        Carregando...
      </p>
    );
  }
  if (status === 'anonymous' || !user) return <LoginScreen />;
  return <Shell user={user} />;
}
