import type { MenuItem } from '@food-stack/shared';

export const DEFAULT_TABLES_COUNT = 12;

export const DEFAULT_MENU: MenuItem[] = [
  { id: 'pf-frango', name: 'Prato feito de frango', category: 'Pratos' },
  { id: 'pf-bife', name: 'Prato feito de bife', category: 'Pratos' },
  { id: 'feijoada', name: 'Feijoada individual', category: 'Pratos' },
  { id: 'lasanha', name: 'Lasanha à bolonhesa', category: 'Pratos' },
  { id: 'batata', name: 'Porção de batata frita', category: 'Porções' },
  { id: 'isca-peixe', name: 'Isca de peixe', category: 'Porções' },
  { id: 'refri', name: 'Refrigerante lata', category: 'Bebidas' },
  { id: 'suco', name: 'Suco natural', category: 'Bebidas' },
  { id: 'agua', name: 'Água sem gás', category: 'Bebidas' },
  { id: 'pudim', name: 'Pudim de leite', category: 'Sobremesas' },
];
