import { z } from 'zod';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@food-stack/shared';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  SEED_MANAGER_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default('Gerente')),
  SEED_MANAGER_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email().optional(),
  ),
  SEED_MANAGER_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).optional(),
  ),
  SEED_SUPER_ADMIN_NAME: z.preprocess(emptyToUndefined, z.string().min(1).default('Super admin')),
  SEED_SUPER_ADMIN_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email().optional(),
  ),
  SEED_SUPER_ADMIN_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (source: NodeJS.ProcessEnv): Env => envSchema.parse(source);
