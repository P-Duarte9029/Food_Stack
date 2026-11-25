import type { Order, OrderStatus } from '@food-stack/shared';

/**
 * O atendente é avisado quando um pedido que ele criou muda para "pronto" depois de
 * já ser conhecido. Pedido visto pela primeira vez (`previous` indefinido) não avisa.
 */
export const shouldNotifyReady = (
  previous: OrderStatus | undefined,
  order: Pick<Order, 'status' | 'createdById'>,
  userId: string | undefined,
): boolean =>
  userId !== undefined &&
  order.createdById === userId &&
  previous !== undefined &&
  previous !== 'ready' &&
  order.status === 'ready';
