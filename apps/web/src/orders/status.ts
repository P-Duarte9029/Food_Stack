import type { OrderStatus } from '@food-stack/shared';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Novo',
  in_preparation: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
};

export const ADVANCE_LABEL: Record<Exclude<OrderStatus, 'ready' | 'delivered'>, string> = {
  placed: 'Iniciar preparo',
  in_preparation: 'Marcar como pronto',
};
