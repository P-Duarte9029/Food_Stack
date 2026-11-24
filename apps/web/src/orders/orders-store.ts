import { useSyncExternalStore } from 'react';
import {
  nextOrderStatus,
  orderSchema,
  type CreateOrderInput,
  type Order,
} from '@food-stack/shared';
import { z } from 'zod';

const STORAGE_KEY = 'food-stack:mock-orders';
const ordersSchema = z.array(orderSchema);
const EMPTY: readonly Order[] = [];

let orders: readonly Order[] = load();
const listeners = new Set<() => void>();

function load(): readonly Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = ordersSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: readonly Order[]): void {
  orders = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sem persistência: o estado em memória continua válido.
  }
  listeners.forEach((listener) => listener());
}

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  orders = load();
  listeners.forEach((listener) => listener());
});

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useOrders = (): readonly Order[] => useSyncExternalStore(subscribe, () => orders);

export function placeOrder(input: CreateOrderInput): void {
  const order: Order = {
    ...input,
    id: crypto.randomUUID(),
    status: 'placed',
    createdAt: new Date().toISOString(),
  };
  commit([...orders, order]);
}

export function advanceOrder(id: string): void {
  commit(
    orders.map((order) => {
      if (order.id !== id) return order;
      const status = nextOrderStatus(order.status);
      return status ? { ...order, status } : order;
    }),
  );
}
