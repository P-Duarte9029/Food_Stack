import {
  createMenuItemInputSchema,
  menuItemSchema,
  tablesCountSchema,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { z } from 'zod';
import { DEFAULT_MENU, DEFAULT_TABLES_COUNT } from '../mocks/menu';
import { createPersistedStore } from '../store/persisted-store';

const menuStore = createPersistedStore<MenuItem[]>(
  'food-stack:mock-menu',
  z.array(menuItemSchema),
  DEFAULT_MENU,
);

const tablesStore = createPersistedStore<number>(
  'food-stack:mock-tables',
  tablesCountSchema,
  DEFAULT_TABLES_COUNT,
);

export const useMenu = menuStore.use;
export const useTablesCount = tablesStore.use;

export function addMenuItem(input: CreateMenuItemInput): void {
  const data = createMenuItemInputSchema.parse(input);
  menuStore.set([...menuStore.get(), { ...data, id: crypto.randomUUID() }]);
}

export function removeMenuItem(id: string): void {
  menuStore.set(menuStore.get().filter((item) => item.id !== id));
}

export function setTablesCount(count: number): void {
  tablesStore.set(tablesCountSchema.parse(count));
}
