import {
  REALTIME_EVENTS,
  menuItemSchema,
  restaurantSettingsSchema,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { z } from 'zod';
import { request } from '../api/client';
import { socket } from '../realtime/socket';
import { createRemoteStore } from '../store/remote-store';

const menuSchema = z.array(menuItemSchema);

const menuStore = createRemoteStore<MenuItem[]>([], () => request('GET', '/menu', menuSchema));

const settingsStore = createRemoteStore<number | null>(null, () =>
  request('GET', '/restaurant/settings', restaurantSettingsSchema).then(
    (settings) => settings.tablesCount,
  ),
);

socket.on(REALTIME_EVENTS.menuChanged, (payload: unknown) => {
  const parsed = menuSchema.safeParse(payload);
  if (parsed.success) menuStore.set(parsed.data);
});

socket.on(REALTIME_EVENTS.settingsChanged, (payload: unknown) => {
  const parsed = restaurantSettingsSchema.safeParse(payload);
  if (parsed.success) settingsStore.set(parsed.data.tablesCount);
});

export const useMenu = menuStore.use;
export const useMenuLoaded = menuStore.useLoaded;
export const useTablesCount = settingsStore.use;

const reloadMenu = async (): Promise<void> =>
  menuStore.set(await request('GET', '/menu', menuSchema));

export async function addMenuItem(input: CreateMenuItemInput): Promise<void> {
  await request('POST', '/menu', menuItemSchema, input);
  await reloadMenu();
}

export async function removeMenuItem(id: string): Promise<void> {
  await request('DELETE', `/menu/${id}`, z.null());
  await reloadMenu();
}

export async function setTablesCount(tablesCount: number): Promise<void> {
  const settings = await request('PUT', '/restaurant/settings', restaurantSettingsSchema, {
    tablesCount,
  });
  settingsStore.set(settings.tablesCount);
}
