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

const categoryKey = (category: string): string =>
  category
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');

export const sameCategory = (a: string, b: string): boolean => categoryKey(a) === categoryKey(b);

/** Remove duplicatas ignorando caixa e acentos, mantendo a primeira grafia encontrada. */
export const distinctCategories = (categories: readonly string[]): string[] => {
  const byKey = new Map<string, string>();
  for (const category of categories) {
    const key = categoryKey(category);
    if (!byKey.has(key)) byKey.set(key, category);
  }
  return [...byKey.values()];
};

/** Devolve a grafia de uma categoria já existente que equivale à informada. */
export const canonicalCategory = (existing: readonly string[], input: string): string =>
  existing.find((category) => sameCategory(category, input)) ?? input;

export const MAX_TABLES = 99;
export const tablesCountSchema = z.number().int().min(1).max(MAX_TABLES);
