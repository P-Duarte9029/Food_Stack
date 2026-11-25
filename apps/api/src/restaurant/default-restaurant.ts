import type { MenuItem } from '@food-stack/shared';

// Enquanto não há autenticação, toda requisição opera sobre este restaurante.
export const DEFAULT_RESTAURANT_ID = '00000000-0000-4000-8000-000000000001';
export const DEFAULT_RESTAURANT_NAME = 'Restaurante padrão';

// Restaurante interno que ancora o super admin (que não pertence a nenhum restaurante
// real). Não aparece na lista da plataforma e nunca recebe dados de operação.
export const PLATFORM_RESTAURANT_ID = '00000000-0000-4000-8000-000000000002';
export const PLATFORM_RESTAURANT_NAME = 'Plataforma';

export const DEFAULT_MENU: ReadonlyArray<Pick<MenuItem, 'name' | 'category'> & Partial<Pick<MenuItem, 'sizes'>>> = [
  { name: 'Prato feito de frango', category: 'Pratos' },
  { name: 'Prato feito de bife', category: 'Pratos' },
  { name: 'Feijoada individual', category: 'Pratos' },
  { name: 'Lasanha à bolonhesa', category: 'Pratos' },
  { name: 'Porção de batata frita', category: 'Porções', sizes: ['Pequena', 'Média', 'Grande'] },
  { name: 'Isca de peixe', category: 'Porções' },
  { name: 'Refrigerante lata', category: 'Bebidas' },
  { name: 'Suco natural', category: 'Bebidas' },
  { name: 'Água sem gás', category: 'Bebidas' },
  { name: 'Pudim de leite', category: 'Sobremesas' },
];
