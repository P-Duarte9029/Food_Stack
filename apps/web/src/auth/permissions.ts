import type { Role } from '@food-stack/shared';

export type Screen = 'atendente' | 'cozinha' | 'controle';

const ALLOWED_SCREENS: Record<Role, readonly Screen[]> = {
  waiter: ['atendente'],
  cook: ['cozinha'],
  manager: ['atendente', 'cozinha', 'controle'],
};

const HOME_SCREEN: Record<Role, Screen> = {
  waiter: 'atendente',
  cook: 'cozinha',
  manager: 'controle',
};

export const canAccess = (role: Role, screen: Screen): boolean =>
  ALLOWED_SCREENS[role].includes(screen);

export const homeScreenOf = (role: Role): Screen => HOME_SCREEN[role];

export const screenFromHash = (hash: string): Screen => {
  if (hash.startsWith('#/cozinha')) return 'cozinha';
  if (hash.startsWith('#/controle')) return 'controle';
  return 'atendente';
};
