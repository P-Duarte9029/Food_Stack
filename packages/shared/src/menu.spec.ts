import { describe, expect, it } from 'vitest';
import { createMenuItemInputSchema, tablesCountSchema } from './menu';

describe('createMenuItemInputSchema', () => {
  it('remove espaços nas pontas', () => {
    expect(createMenuItemInputSchema.parse({ name: '  Pudim ', category: ' Sobremesas ' })).toEqual({
      name: 'Pudim',
      category: 'Sobremesas',
    });
  });

  it('rejeita nome ou categoria vazios', () => {
    expect(createMenuItemInputSchema.safeParse({ name: '  ', category: 'Pratos' }).success).toBe(false);
    expect(createMenuItemInputSchema.safeParse({ name: 'Pudim', category: '' }).success).toBe(false);
  });
});

describe('tablesCountSchema', () => {
  it('aceita de 1 a 99 e rejeita fora do intervalo ou fracionado', () => {
    expect(tablesCountSchema.safeParse(1).success).toBe(true);
    expect(tablesCountSchema.safeParse(99).success).toBe(true);
    expect(tablesCountSchema.safeParse(0).success).toBe(false);
    expect(tablesCountSchema.safeParse(100).success).toBe(false);
    expect(tablesCountSchema.safeParse(2.5).success).toBe(false);
  });
});
