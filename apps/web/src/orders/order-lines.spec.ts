import { describe, expect, it } from 'vitest';
import type { MenuItem } from '@food-stack/shared';
import { menuLines } from './order-lines';

const item = (sizes: string[]): MenuItem => ({ id: 'm1', name: 'Batata frita', category: 'Porções', sizes });

describe('menuLines', () => {
  it('prato sem tamanhos gera uma única linha sem tamanho', () => {
    expect(menuLines(item([]))).toEqual([
      { key: 'm1', menuItemId: 'm1', name: 'Batata frita', size: null },
    ]);
  });

  it('prato com tamanhos gera uma linha por tamanho, com chaves distintas', () => {
    const lines = menuLines(item(['Média', 'Grande']));
    expect(lines.map((line) => line.size)).toEqual(['Média', 'Grande']);
    expect(new Set(lines.map((line) => line.key)).size).toBe(2);
  });
});
