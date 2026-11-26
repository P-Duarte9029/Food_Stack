import type { MenuItem } from '@food-stack/shared';

/** Uma linha selecionável do pedido: um prato, ou um prato em um tamanho. */
export interface MenuLine {
  key: string;
  menuItemId: string;
  name: string;
  size: string | null;
}

export const menuLines = (item: MenuItem): MenuLine[] =>
  item.sizes.length === 0
    ? [{ key: item.id, menuItemId: item.id, name: item.name, size: null }]
    : item.sizes.map((size) => ({
        key: `${item.id}|${size}`,
        menuItemId: item.id,
        name: item.name,
        size,
      }));
