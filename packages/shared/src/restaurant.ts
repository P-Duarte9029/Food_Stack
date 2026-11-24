import { z } from 'zod';
import { tablesCountSchema } from './menu';

export const restaurantSettingsSchema = z.object({
  tablesCount: tablesCountSchema,
});
export type RestaurantSettings = z.infer<typeof restaurantSettingsSchema>;
