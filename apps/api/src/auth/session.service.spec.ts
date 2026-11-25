import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma.service';
import { SessionService } from './session.service';

const future = new Date(Date.now() + 60_000);

const sessionOf = (overrides: {
  userActive?: boolean;
  restaurantActive?: boolean;
  expiresAt?: Date;
}) => ({
  expiresAt: overrides.expiresAt ?? future,
  user: {
    id: 'u1',
    restaurantId: 'r1',
    name: 'Ana',
    email: 'ana@x.co',
    role: 'waiter',
    active: overrides.userActive ?? true,
    restaurant: { active: overrides.restaurantActive ?? true },
  },
});

function setup(session: ReturnType<typeof sessionOf> | null) {
  const findUnique = vi.fn().mockResolvedValue(session);
  return new SessionService({ session: { findUnique } } as unknown as PrismaService);
}

describe('SessionService.validate', () => {
  it('devolve o usuário de uma sessão válida', async () => {
    await expect(setup(sessionOf({})).validate('tok')).resolves.toEqual({
      id: 'u1',
      restaurantId: 'r1',
      name: 'Ana',
      email: 'ana@x.co',
      role: 'waiter',
    });
  });

  it('rejeita quando não há token ou sessão', async () => {
    expect(await setup(null).validate(undefined)).toBeNull();
    expect(await setup(null).validate('tok')).toBeNull();
  });

  it('rejeita sessão expirada ou de usuário desativado', async () => {
    expect(await setup(sessionOf({ expiresAt: new Date(0) })).validate('t')).toBeNull();
    expect(await setup(sessionOf({ userActive: false })).validate('t')).toBeNull();
  });

  it('rejeita sessão de usuário de um restaurante desativado', async () => {
    expect(await setup(sessionOf({ restaurantActive: false })).validate('tok')).toBeNull();
  });
});
