import { z } from 'zod';

export const CUSTOMER_NAME_MAX_LENGTH = 40;

export const customerNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome do cliente')
  .max(CUSTOMER_NAME_MAX_LENGTH, `Máximo de ${CUSTOMER_NAME_MAX_LENGTH} caracteres`);

export const openTableSessionInputSchema = z.object({
  // Gerado no cliente: torna o reenvio da fila offline idempotente.
  id: z.string().uuid().optional(),
  table: z.number().int().positive(),
  customerName: customerNameSchema,
});
export type OpenTableSessionInput = z.infer<typeof openTableSessionInputSchema>;

/** Mesa aberta: ocupação de uma mesa por um cliente, até ser fechada. */
export const tableSessionSchema = openTableSessionInputSchema.extend({
  id: z.string().min(1),
  openedAt: z.string().datetime(),
});
export type TableSession = z.infer<typeof tableSessionSchema>;
