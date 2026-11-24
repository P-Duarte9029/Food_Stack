import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { restoreSession } from './auth/auth-store';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

void restoreSession();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
