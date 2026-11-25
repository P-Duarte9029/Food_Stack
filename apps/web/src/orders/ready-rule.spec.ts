import { describe, expect, it } from 'vitest';
import { shouldNotifyReady } from './ready-rule';

const mine = { status: 'ready', createdById: 'u1' } as const;

describe('shouldNotifyReady', () => {
  it('avisa quando o pedido do usuário passa a pronto', () => {
    expect(shouldNotifyReady('in_preparation', mine, 'u1')).toBe(true);
    expect(shouldNotifyReady('placed', mine, 'u1')).toBe(true);
  });

  it('não avisa pedido de outro atendente', () => {
    expect(shouldNotifyReady('in_preparation', { ...mine, createdById: 'u2' }, 'u1')).toBe(false);
  });

  it('não avisa pedido sem autor (anterior ao registro de autor)', () => {
    expect(shouldNotifyReady('in_preparation', { ...mine, createdById: null }, 'u1')).toBe(false);
  });

  it('não avisa pedido visto pela primeira vez, mesmo já pronto', () => {
    expect(shouldNotifyReady(undefined, mine, 'u1')).toBe(false);
  });

  it('não repete aviso de pedido que já estava pronto', () => {
    expect(shouldNotifyReady('ready', mine, 'u1')).toBe(false);
  });

  it('não avisa enquanto o pedido não está pronto', () => {
    expect(shouldNotifyReady('placed', { ...mine, status: 'in_preparation' }, 'u1')).toBe(false);
  });

  it('não avisa sem usuário logado', () => {
    expect(shouldNotifyReady('in_preparation', mine, undefined)).toBe(false);
  });
});
