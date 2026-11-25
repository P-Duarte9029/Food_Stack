import { describe, expect, it } from 'vitest';
import { ROLE_LABEL, createUserInputSchema, roleSchema, staffRoleSchema } from './auth';
import {
  DEFAULT_TABLES_COUNT,
  createRestaurantInputSchema,
  updateRestaurantInputSchema,
} from './platform';

const manager = { name: 'Marta', email: ' Marta@Bistro.co ', password: 'senha-bem-longa-1' };

describe('papéis', () => {
  it('o super admin existe como papel, com rótulo', () => {
    expect(roleSchema.safeParse('super_admin').success).toBe(true);
    expect(ROLE_LABEL.super_admin).toBe('Super admin');
  });

  it('a equipe de um restaurante não inclui o super admin', () => {
    expect(staffRoleSchema.options).toEqual(['waiter', 'cook', 'manager']);
  });

  it('criar usuário pela equipe recusa o papel super admin', () => {
    const input = { name: 'X', email: 'x@y.co', password: 'senha-bem-longa-1' };
    expect(createUserInputSchema.safeParse({ ...input, role: 'manager' }).success).toBe(true);
    expect(createUserInputSchema.safeParse({ ...input, role: 'super_admin' }).success).toBe(false);
  });
});

describe('createRestaurantInputSchema', () => {
  it('usa 12 mesas por padrão e normaliza nome e e-mail do gerente', () => {
    const parsed = createRestaurantInputSchema.parse({ name: '  Bistrô ', manager });
    expect(parsed.name).toBe('Bistrô');
    expect(parsed.tablesCount).toBe(DEFAULT_TABLES_COUNT);
    expect(parsed.manager.email).toBe('marta@bistro.co');
  });

  it('exige nome do restaurante e dados válidos do gerente', () => {
    expect(createRestaurantInputSchema.safeParse({ name: ' ', manager }).success).toBe(false);
    expect(
      createRestaurantInputSchema.safeParse({ name: 'Bistrô', manager: { ...manager, password: 'curta' } })
        .success,
    ).toBe(false);
    expect(createRestaurantInputSchema.safeParse({ name: 'Bistrô' }).success).toBe(false);
  });

  it('limita a quantidade de mesas', () => {
    expect(createRestaurantInputSchema.safeParse({ name: 'B', tablesCount: 0, manager }).success).toBe(false);
    expect(createRestaurantInputSchema.safeParse({ name: 'B', tablesCount: 100, manager }).success).toBe(
      false,
    );
  });

  it('o cliente não escolhe o papel do primeiro usuário: ele é sempre gerente', () => {
    const parsed = createRestaurantInputSchema.parse({
      name: 'B',
      manager: { ...manager, role: 'super_admin' },
    });
    expect('role' in parsed.manager).toBe(false);
  });
});

describe('updateRestaurantInputSchema', () => {
  it('aceita alterar só um campo', () => {
    expect(updateRestaurantInputSchema.safeParse({ active: false }).success).toBe(true);
    expect(updateRestaurantInputSchema.safeParse({ tablesCount: 20 }).success).toBe(true);
  });

  it('exige ao menos um campo', () => {
    expect(updateRestaurantInputSchema.safeParse({}).success).toBe(false);
  });
});
