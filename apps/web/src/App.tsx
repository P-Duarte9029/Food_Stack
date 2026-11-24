import { useEffect, useState } from 'react';
import { fetchHealth } from './api';

type ApiState = 'checking' | 'online' | 'offline';

const statusLabel: Record<ApiState, string> = {
  checking: 'Verificando API...',
  online: 'API online',
  offline: 'API indisponível',
};

export function App() {
  const [state, setState] = useState<ApiState>('checking');

  useEffect(() => {
    fetchHealth()
      .then(() => setState('online'))
      .catch(() => setState('offline'));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-bold text-orange-600">Food Stack</h1>
      <p className="text-slate-600">Do pedido na mesa à cozinha, em tempo real.</p>
      <p role="status" className="text-sm text-slate-700">
        {statusLabel[state]}
      </p>
    </main>
  );
}
