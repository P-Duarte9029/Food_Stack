import type { SessionUser, Order } from '@food-stack/shared';

type Deliverer = Pick<SessionUser, 'id' | 'role'>;

/** Pronto e do usuário: o gerente entrega qualquer um; os demais, só os que criaram. */
export const canDeliverOrder = (
  order: Pick<Order, 'status' | 'createdById'>,
  user: Deliverer | null,
): boolean =>
  user !== null &&
  order.status === 'ready' &&
  (user.role === 'manager' || order.createdById === user.id);

export const countReadyToDeliver = (
  orders: readonly Pick<Order, 'status' | 'createdById'>[],
  user: Deliverer | null,
): number => orders.filter((order) => canDeliverOrder(order, user)).length;
