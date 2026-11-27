import { describe, expect, it } from 'vitest';
import { canDeliverOrder, countReadyToDeliver } from './delivery-rule';

const waiter = { id: 'u1', role: 'waiter' } as const;
const manager = { id: 'u9', role: 'manager' } as const;
const ready = (createdById: string | null) => ({ status: 'ready', createdById }) as const;

describe('canDeliverOrder', () => {
  it('o atendente entrega o pedido pronto que criou', () => {
    expect(canDeliverOrder(ready('u1'), waiter)).toBe(true);
  });

  it('o atendente não entrega pedido de outro nem sem autor', () => {
    expect(canDeliverOrder(ready('u2'), waiter)).toBe(false);
    expect(canDeliverOrder(ready(null), waiter)).toBe(false);
  });

  it('o gerente entrega qualquer pedido pronto', () => {
    expect(canDeliverOrder(ready('u2'), manager)).toBe(true);
    expect(canDeliverOrder(ready(null), manager)).toBe(true);
  });

  it('só pedidos prontos', () => {
    expect(canDeliverOrder({ status: 'in_preparation', createdById: 'u1' }, waiter)).toBe(false);
    expect(canDeliverOrder({ status: 'delivered', createdById: 'u1' }, waiter)).toBe(false);
  });

  it('sem usuário não entrega', () => {
    expect(canDeliverOrder(ready('u1'), null)).toBe(false);
  });
});

describe('countReadyToDeliver', () => {
  it('conta os prontos do usuário e deixa de contar quando entregues', () => {
    const orders = [ready('u1'), ready('u1'), ready('u2'), { status: 'placed', createdById: 'u1' } as const];
    expect(countReadyToDeliver(orders, waiter)).toBe(2);

    const afterDelivery = [{ status: 'delivered', createdById: 'u1' } as const, ...orders.slice(1)];
    expect(countReadyToDeliver(afterDelivery, waiter)).toBe(1);
  });
});
