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

  it('gerente acessa todas as telas do restaurante, mas não a plataforma', () => {
    for (const screen of ['atendente', 'cozinha', 'controle'] as const) {
      expect(canAccess('manager', screen)).toBe(true);
    }
    expect(canAccess('manager', 'plataforma')).toBe(false);
  });

  it('só o super admin acessa a plataforma, e nenhuma tela de restaurante', () => {
    expect(canAccess('super_admin', 'plataforma')).toBe(true);
    for (const screen of ['atendente', 'cozinha', 'controle'] as const) {
      expect(canAccess('super_admin', screen)).toBe(false);
    }
    for (const role of ['waiter', 'cook'] as const) {
      expect(canAccess(role, 'plataforma')).toBe(false);
    }
  });

  it('a tela inicial de cada papel é uma tela permitida', () => {
    for (const role of ['waiter', 'cook', 'manager', 'super_admin'] as const) {
      expect(canAccess(role, homeScreenOf(role))).toBe(true);
    }
  });

  it('resolve a tela pelo hash, inclusive subrotas', () => {
    expect(screenFromHash('#/atendente/enviados')).toBe('atendente');
    expect(screenFromHash('#/cozinha')).toBe('cozinha');
    expect(screenFromHash('#/plataforma')).toBe('plataforma');
    expect(screenFromHash('')).toBe('atendente');
  });
});
