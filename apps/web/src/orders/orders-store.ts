import {
  nextOrderStatus,
  orderSchema,
  type CreateOrderInput,
  type Order,
} from '@food-stack/shared';
import { z } from 'zod';
import { createPersistedStore } from '../store/persisted-store';

const store = createPersistedStore<Order[]>(
  'food-stack:mock-orders',
  z.array(orderSchema),
  [],
);

export const useOrders = store.use;

export function placeOrder(input: CreateOrderInput): void {
  const order: Order = {
    ...input,
    id: crypto.randomUUID(),
    status: 'placed',
    createdAt: new Date().toISOString(),
  };
  store.set([...store.get(), order]);
}

export function advanceOrder(id: string): void {
  store.set(
    store.get().map((order) => {
      if (order.id !== id) return order;
      const status = nextOrderStatus(order.status);
      return status ? { ...order, status } : order;
    }),
  );
}
