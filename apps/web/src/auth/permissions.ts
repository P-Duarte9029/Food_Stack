import type { Role } from '@food-stack/shared';

export type Screen = 'atendente' | 'cozinha' | 'controle' | 'plataforma';

const ALLOWED_SCREENS: Record<Role, readonly Screen[]> = {
  waiter: ['atendente'],
  cook: ['cozinha'],
  manager: ['atendente', 'cozinha', 'controle'],
  super_admin: ['plataforma'],
};

const HOME_SCREEN: Record<Role, Screen> = {
  waiter: 'atendente',
  cook: 'cozinha',
  manager: 'controle',
  super_admin: 'plataforma',
};

export const canAccess = (role: Role, screen: Screen): boolean =>
  ALLOWED_SCREENS[role].includes(screen);

export const homeScreenOf = (role: Role): Screen => HOME_SCREEN[role];

export const screenFromHash = (hash: string): Screen => {
  if (hash.startsWith('#/cozinha')) return 'cozinha';
  if (hash.startsWith('#/controle')) return 'controle';
  if (hash.startsWith('#/plataforma')) return 'plataforma';
  return 'atendente';
};
