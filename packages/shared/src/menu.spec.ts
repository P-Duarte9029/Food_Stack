import { describe, expect, it } from 'vitest';
import { canonicalCategory, createMenuItemInputSchema, distinctCategories, sameCategory, tablesCountSchema } from './menu';

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

describe('categorias', () => {
  it('compara ignorando caixa e espaços nas pontas', () => {
    expect(sameCategory('Doce', ' doce ')).toBe(true);
    expect(sameCategory('Doce', 'Salgado')).toBe(false);
  });

  it('ignora acentos', () => {
    expect(sameCategory('Porções', 'porcoes')).toBe(true);
    expect(sameCategory('Sobremesa', 'SOBREMESÁ')).toBe(true);
    expect(canonicalCategory(['Porções'], 'Porcoes')).toBe('Porções');
  });

  it('reaproveita a grafia de uma categoria existente', () => {
    expect(canonicalCategory(['Pratos', 'Doce'], 'doce')).toBe('Doce');
    expect(canonicalCategory(['Pratos'], 'Bebidas')).toBe('Bebidas');
  });

  it('agrupa duplicatas antigas mantendo a primeira grafia', () => {
    expect(distinctCategories(['Doce', 'Pratos', 'doce', 'DOCE'])).toEqual(['Doce', 'Pratos']);
  });
});
