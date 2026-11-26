import { z } from 'zod';

export const orderStatusSchema = z.enum(['placed', 'in_preparation', 'ready', 'delivered']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  // Tamanho escolhido; ausente em pratos sem tamanhos e em pedidos antigos.
  size: z.string().min(1).nullish(),
  quantity: z.number().int().positive(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

/** Texto do item para telas: "Batata frita (Grande)" ou só o nome. */
export const orderItemLabel = (item: Pick<OrderItem, 'name' | 'size'>): string =>
  item.size ? `${item.name} (${item.size})` : item.name;

export const createOrderInputSchema = z.object({
  // Gerado no cliente: torna o reenvio de pedidos da fila offline idempotente.
  id: z.string().uuid().optional(),
  table: z.number().int().positive(),
  // Sem ele, o servidor usa a mesa aberta; clientes antigos continuam funcionando.
  tableSessionId: z.string().uuid().optional(),
  // Comanda do pedido. Sem ela, vale a única comanda aberta da mesa.
  checkId: z.string().uuid().optional(),
  items: z.array(orderItemSchema).min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const orderSchema = createOrderInputSchema.extend({
  id: z.string().min(1),
  status: orderStatusSchema,
  // Nome da comanda (ou de quem abriu a mesa). Pedidos antigos não têm cliente.
  customerName: z.string().nullable().default(null),
  // Atendente que criou o pedido; nulo nos pedidos anteriores a este registro.
  createdById: z.string().nullable().default(null),
  createdByName: z.string().nullable().default(null),
  createdAt: z.string().datetime(),
});
export type Order = z.infer<typeof orderSchema>;

// Avanço feito pela cozinha: termina em "pronto". A entrega é uma ação própria do atendente.
const nextStatusByStatus: Record<OrderStatus, OrderStatus | null> = {
  placed: 'in_preparation',
  in_preparation: 'ready',
  ready: null,
  delivered: null,
};

export const nextOrderStatus = (status: OrderStatus): OrderStatus | null =>
  nextStatusByStatus[status];
