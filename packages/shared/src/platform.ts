import { z } from 'zod';
import { createUserInputSchema } from './auth';
import { tablesCountSchema } from './menu';

export const DEFAULT_TABLES_COUNT = 12;

export const restaurantNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome do restaurante')
  .max(60, 'Máximo de 60 caracteres');

/** Restaurante novo, criado junto com o primeiro gerente. */
export const createRestaurantInputSchema = z.object({
  name: restaurantNameSchema,
  tablesCount: tablesCountSchema.default(DEFAULT_TABLES_COUNT),
  manager: createUserInputSchema.pick({ name: true, email: true, password: true }),
});
export type CreateRestaurantInput = z.infer<typeof createRestaurantInputSchema>;

export const updateRestaurantInputSchema = z
  .object({
    name: restaurantNameSchema.optional(),
    tablesCount: tablesCountSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Informe ao menos um campo para alterar',
  });
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantInputSchema>;

export const platformRestaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tablesCount: tablesCountSchema,
  active: z.boolean(),
  createdAt: z.string().datetime(),
});
export type PlatformRestaurant = z.infer<typeof platformRestaurantSchema>;
