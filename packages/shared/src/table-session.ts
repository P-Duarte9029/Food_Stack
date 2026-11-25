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
  // Id da primeira comanda, gerado no cliente para a fila offline referenciá-la.
  checkId: z.string().uuid().optional(),
});
export type OpenTableSessionInput = z.infer<typeof openTableSessionInputSchema>;

export const addGuestCheckInputSchema = z.object({
  // Gerado no cliente: torna o reenvio da fila offline idempotente.
  id: z.string().uuid().optional(),
  name: customerNameSchema,
});
export type AddGuestCheckInput = z.infer<typeof addGuestCheckInputSchema>;

/** Comanda: a conta de uma pessoa dentro da mesa aberta. */
export const guestCheckSchema = z.object({
  id: z.string().min(1),
  name: customerNameSchema,
});
export type GuestCheck = z.infer<typeof guestCheckSchema>;

/**
 * Mesa aberta: ocupação de uma mesa até ser fechada. `customerName` é quem abriu a
 * mesa; `checks` são as comandas abertas (vazio em mesas abertas antes das comandas).
 */
export const tableSessionSchema = openTableSessionInputSchema.omit({ checkId: true }).extend({
  id: z.string().min(1),
  openedAt: z.string().datetime(),
  checks: z.array(guestCheckSchema).default([]),
});
export type TableSession = z.infer<typeof tableSessionSchema>;
