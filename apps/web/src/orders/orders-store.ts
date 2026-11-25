import { REALTIME_EVENTS, orderSchema, type Order } from '@food-stack/shared';
import { z } from 'zod';
import { request } from '../api/client';
import { socket } from '../realtime/socket';
import { createRemoteStore } from '../store/remote-store';

const ordersSchema = z.array(orderSchema);

const store = createRemoteStore<Order[]>([], () => request('GET', '/orders', ordersSchema), {
  key: 'orders',
  schema: ordersSchema,
});

export function upsertOrder(order: Order): void {
  const orders = store.get();
  const exists = orders.some((current) => current.id === order.id);
  store.set(
    exists
      ? orders.map((current) => (current.id === order.id ? order : current))
      : [...orders, order],
  );
}

function onOrderEvent(payload: unknown): void {
  const parsed = orderSchema.safeParse(payload);
  if (parsed.success) upsertOrder(parsed.data);
}

socket.on(REALTIME_EVENTS.orderCreated, onOrderEvent);
socket.on(REALTIME_EVENTS.orderUpdated, onOrderEvent);

export const useOrders = store.use;
export const getOrders = store.get;
export const subscribeOrders = store.subscribe;

export async function advanceOrder(id: string): Promise<void> {
  upsertOrder(await request('PATCH', `/orders/${id}/advance`, orderSchema));
}
