import { describe, expect, it } from 'vitest';
import { createOrderInputSchema, orderSchema } from './order';
import {
  CUSTOMER_NAME_MAX_LENGTH,
  addGuestCheckInputSchema,
  openTableSessionInputSchema,
  tableSessionSchema,
} from './table-session';

describe('openTableSessionInputSchema', () => {
  it('aparra o nome do cliente', () => {
    expect(openTableSessionInputSchema.parse({ table: 2, customerName: '  Ana ' })).toEqual({
      table: 2,
      customerName: 'Ana',
    });
  });

  it('exige nome do cliente', () => {
    expect(openTableSessionInputSchema.safeParse({ table: 2, customerName: '   ' }).success).toBe(false);
    expect(openTableSessionInputSchema.safeParse({ table: 2 }).success).toBe(false);
  });

  it('limita o tamanho do nome', () => {
    const limit = 'a'.repeat(CUSTOMER_NAME_MAX_LENGTH);
    expect(openTableSessionInputSchema.safeParse({ table: 2, customerName: limit }).success).toBe(true);
    expect(
      openTableSessionInputSchema.safeParse({ table: 2, customerName: `${limit}a` }).success,
    ).toBe(false);
  });

  it('rejeita mesa inválida', () => {
    expect(openTableSessionInputSchema.safeParse({ table: 0, customerName: 'Ana' }).success).toBe(false);
  });
});

describe('compatibilidade dos pedidos com mesa aberta', () => {
  const items = [{ menuItemId: 'm1', name: 'Pudim', quantity: 1 }];

  it('aceita pedido sem tableSessionId (clientes e filas antigas)', () => {
    expect(createOrderInputSchema.safeParse({ table: 1, items }).success).toBe(true);
  });

  it('pedido antigo sem cliente é lido com customerName nulo', () => {
    const order = orderSchema.parse({
      id: 'o1',
      table: 1,
      items,
      status: 'placed',
      createdAt: '2026-11-25T12:00:00.000Z',
    });
    expect(order.customerName).toBeNull();
  });
});

describe('comandas', () => {
  const session = { id: 's1', table: 2, customerName: 'Ana', openedAt: '2026-11-25T12:00:00.000Z' };

  it('mesa aberta antes das comandas é lida com lista vazia', () => {
    expect(tableSessionSchema.parse(session).checks).toEqual([]);
  });

  it('lê as comandas abertas da mesa', () => {
    const parsed = tableSessionSchema.parse({ ...session, checks: [{ id: 'c1', name: 'Ana' }] });
    expect(parsed.checks).toEqual([{ id: 'c1', name: 'Ana' }]);
  });

  it('exige nome da comanda com o mesmo limite do cliente', () => {
    expect(addGuestCheckInputSchema.safeParse({ name: ' Beto ' }).data).toEqual({ name: 'Beto' });
    expect(addGuestCheckInputSchema.safeParse({ name: ' ' }).success).toBe(false);
    expect(
      addGuestCheckInputSchema.safeParse({ name: 'a'.repeat(CUSTOMER_NAME_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });

  it('pedido aceita comanda opcional e rejeita id inválido', () => {
    const items = [{ menuItemId: 'm1', name: 'Pudim', quantity: 1 }];
    expect(createOrderInputSchema.safeParse({ table: 1, items }).success).toBe(true);
    expect(
      createOrderInputSchema.safeParse({ table: 1, items, checkId: '6f1d2c3e-1111-4222-8333-444455556666' })
        .success,
    ).toBe(true);
    expect(createOrderInputSchema.safeParse({ table: 1, items, checkId: 'x' }).success).toBe(false);
  });
});
