import { z } from 'zod';

const categoryKey = (category: string): string =>
  category
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');

export const MAX_SIZES_PER_ITEM = 6;

const sizeNameSchema = z.string().trim().min(1, 'Informe o nome do tamanho').max(20, 'Máximo de 20 caracteres');

const sizesSchema = z
  .array(sizeNameSchema)
  .max(MAX_SIZES_PER_ITEM, `Máximo de ${MAX_SIZES_PER_ITEM} tamanhos`)
  .refine(
    (sizes) => new Set(sizes.map(categoryKey)).size === sizes.length,
    'Tamanhos repetidos',
  );

export const createMenuItemInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do prato').max(60, 'Máximo de 60 caracteres'),
  category: z.string().trim().min(1, 'Informe a categoria').max(30, 'Máximo de 30 caracteres'),
  // Vazio = prato sem variação de tamanho. Pratos antigos são lidos assim.
  sizes: sizesSchema.default([]),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;

export const menuItemSchema = createMenuItemInputSchema.extend({
  id: z.string().min(1),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const sameSize = (a: string, b: string): boolean => categoryKey(a) === categoryKey(b);

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
