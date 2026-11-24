import { describe, expect, it } from 'vitest';
import { canAccess, homeScreenOf, screenFromHash } from './permissions';

describe('permissions', () => {
  it('garçom acessa só o atendente e cozinheiro só a cozinha', () => {
    expect(canAccess('waiter', 'atendente')).toBe(true);
    expect(canAccess('waiter', 'cozinha')).toBe(false);
    expect(canAccess('waiter', 'controle')).toBe(false);
    expect(canAccess('cook', 'cozinha')).toBe(true);
    expect(canAccess('cook', 'atendente')).toBe(false);
  });

  it('gerente acessa todas as telas', () => {
    for (const screen of ['atendente', 'cozinha', 'controle'] as const) {
      expect(canAccess('manager', screen)).toBe(true);
    }
  });

  it('a tela inicial de cada papel é uma tela permitida', () => {
    for (const role of ['waiter', 'cook', 'manager'] as const) {
      expect(canAccess(role, homeScreenOf(role))).toBe(true);
    }
  });

  it('resolve a tela pelo hash, inclusive subrotas', () => {
    expect(screenFromHash('#/atendente/enviados')).toBe('atendente');
    expect(screenFromHash('#/cozinha')).toBe('cozinha');
    expect(screenFromHash('')).toBe('atendente');
  });
});
