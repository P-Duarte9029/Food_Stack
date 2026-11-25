import { z } from 'zod';

export const orderStatusSchema = z.enum(['placed', 'in_preparation', 'ready']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

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
  createdAt: z.string().datetime(),
});
export type Order = z.infer<typeof orderSchema>;

const nextStatusByStatus: Record<OrderStatus, OrderStatus | null> = {
  placed: 'in_preparation',
  in_preparation: 'ready',
  ready: null,
};

export const nextOrderStatus = (status: OrderStatus): OrderStatus | null =>
  nextStatusByStatus[status];
