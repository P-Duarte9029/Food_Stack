import { z } from 'zod';

export const roleSchema = z.enum(['waiter', 'cook', 'manager', 'super_admin']);
export type Role = z.infer<typeof roleSchema>;

/** Papéis de dentro de um restaurante. O super admin é da plataforma e não é criado pela equipe. */
export const staffRoleSchema = z.enum(['waiter', 'cook', 'manager']);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const ROLE_LABEL: Record<Role, string> = {
  waiter: 'Garçom',
  cook: 'Cozinheiro',
  manager: 'Gerente',
  super_admin: 'Super admin',
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'E-mail muito longo')
  .email('Informe um e-mail válido');

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha').max(MAX_PASSWORD_LENGTH),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
  role: roleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const createUserInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(60, 'Máximo de 60 caracteres'),
  email: emailSchema,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`)
    .max(MAX_PASSWORD_LENGTH, `Máximo de ${MAX_PASSWORD_LENGTH} caracteres`),
  role: staffRoleSchema,
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const userSummarySchema = sessionUserSchema.extend({
  active: z.boolean(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

export const updateUserInputSchema = z.object({
  active: z.boolean(),
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

/** Edição de perfil pelo super admin: só os campos informados mudam (senha em branco não vai). */
export const updateUserProfileInputSchema = createUserInputSchema
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Informe ao menos um campo para alterar',
  });
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;

/** PATCH da equipe pelo super admin: ou ativa/desativa, ou edita o perfil, nunca os dois juntos. */
export const platformUpdateUserInputSchema = z.union([
  updateUserInputSchema.strict(),
  createUserInputSchema.partial().strict().pipe(updateUserProfileInputSchema),
]);
export type PlatformUpdateUserInput = z.infer<typeof platformUpdateUserInputSchema>;
