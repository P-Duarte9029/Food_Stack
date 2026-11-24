import {
  REALTIME_EVENTS,
  orderSchema,
  type CreateOrderInput,
  type Order,
} from '@food-stack/shared';
import { z } from 'zod';
import { request } from '../api/client';
import { socket } from '../realtime/socket';
import { createRemoteStore } from '../store/remote-store';

const ordersSchema = z.array(orderSchema);

let orders: Order[] = [];

const store = createRemoteStore<Order[]>([], () =>
  request('GET', '/orders', ordersSchema).then((loaded) => {
    orders = loaded;
    return loaded;
  }),
);

function upsert(order: Order): void {
  const exists = orders.some((current) => current.id === order.id);
  orders = exists
    ? orders.map((current) => (current.id === order.id ? order : current))
    : [...orders, order];
  store.set(orders);
}

function onOrderEvent(payload: unknown): void {
  const parsed = orderSchema.safeParse(payload);
  if (parsed.success) upsert(parsed.data);
}

socket.on(REALTIME_EVENTS.orderCreated, onOrderEvent);
socket.on(REALTIME_EVENTS.orderUpdated, onOrderEvent);

export const useOrders = store.use;

export async function placeOrder(input: CreateOrderInput): Promise<void> {
  upsert(await request('POST', '/orders', orderSchema, input));
}

export async function advanceOrder(id: string): Promise<void> {
  upsert(await request('PATCH', `/orders/${id}/advance`, orderSchema));
}
