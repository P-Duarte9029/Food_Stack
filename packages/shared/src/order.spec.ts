import { describe, expect, it } from 'vitest';
import { createOrderInputSchema, nextOrderStatus } from './order';

describe('nextOrderStatus', () => {
  it('avança placed -> in_preparation -> ready', () => {
    expect(nextOrderStatus('placed')).toBe('in_preparation');
    expect(nextOrderStatus('in_preparation')).toBe('ready');
  });

  it('não avança além de ready', () => {
    expect(nextOrderStatus('ready')).toBeNull();
  });
});

describe('createOrderInputSchema', () => {
  const item = { menuItemId: 'x', name: 'X', quantity: 1 };

  it('exige ao menos um item', () => {
    expect(createOrderInputSchema.safeParse({ table: 1, items: [] }).success).toBe(false);
  });

  it('rejeita quantidade inválida', () => {
    expect(
      createOrderInputSchema.safeParse({ table: 1, items: [{ ...item, quantity: 0 }] }).success,
    ).toBe(false);
  });

  it('aceita pedido válido', () => {
    expect(createOrderInputSchema.safeParse({ table: 3, items: [item] }).success).toBe(true);
  });
});

describe('status entregue', () => {
  it('a cozinha não avança além de pronto, e entregue é final', () => {
    expect(nextOrderStatus('ready')).toBeNull();
    expect(nextOrderStatus('delivered')).toBeNull();
  });
});
