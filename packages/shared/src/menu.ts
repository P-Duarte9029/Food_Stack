import { z } from 'zod';

export const createMenuItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do prato').max(60, 'Máximo de 60 caracteres'),
  category: z.string().trim().min(1, 'Informe a categoria').max(30, 'Máximo de 30 caracteres'),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;

export const menuItemSchema = createMenuItemInputSchema.extend({
  id: z.string().min(1),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const MAX_TABLES = 99;
export const tablesCountSchema = z.number().int().min(1).max(MAX_TABLES);
