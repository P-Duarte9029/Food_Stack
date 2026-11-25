import type { OrderStatus } from '@food-stack/shared';
import { getAuthState, subscribeAuth } from '../auth/auth-store';
import { pushNotice } from '../notifications/notices-store';
import { getOrders, subscribeOrders } from './orders-store';
import { shouldNotifyReady } from './ready-rule';

// Último status conhecido de cada pedido. Pedido visto pela primeira vez só é
// registrado: avisa apenas quando o status muda para "pronto" depois de conhecido
// (inclusive se isso aconteceu enquanto o app estava sem conexão).
const lastStatus = new Map<string, OrderStatus>();

subscribeOrders(() => {
  const user = getAuthState().user;
  for (const order of getOrders()) {
    const previous = lastStatus.get(order.id);
    lastStatus.set(order.id, order.status);
    if (shouldNotifyReady(previous, order, user?.id)) {
      pushNotice({
        id: `ready-${order.id}`,
        title: 'Pedido pronto',
        message: `Mesa ${order.table}${order.customerName ? ` · ${order.customerName}` : ''}`,
      });
    }
  }
});

subscribeAuth(() => lastStatus.clear());
