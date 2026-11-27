import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../auth/session.service';
import type { UsersService } from '../users/users.service';
import { PlatformUsersController } from './platform-users.controller';
import type { PlatformService } from './platform.service';

const RESTAURANT_ID = '6f1d2c3e-1111-4222-8333-444455556666';
const USER_ID = '6f1d2c3e-2222-4222-8333-444455556666';
const actor = { id: 'super-1', role: 'super_admin' } as AuthUser;

function setup(manageable = true) {
  const assertManageable = vi.fn(
    manageable ? () => Promise.resolve() : () => Promise.reject(new NotFoundException()),
  );
  const users = {
    list: vi.fn().mockResolvedValue([]),
    updateProfile: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    setActive: vi.fn().mockResolvedValue({}),
  };
  const controller = new PlatformUsersController(
    { assertManageable } as unknown as PlatformService,
    users as unknown as UsersService,
  );
  return { controller, assertManageable, users };
}

describe('PlatformUsersController', () => {
  it('lista a equipe do restaurante da rota', async () => {
    const { controller, users } = setup();
    await controller.list(RESTAURANT_ID);
    expect(users.list).toHaveBeenCalledWith(RESTAURANT_ID);
  });

  it('cria o usuário no restaurante da rota', async () => {
    const { controller, users } = setup();
    const body = { name: 'Ana', email: 'ana@x.co', password: 'senha-bem-longa-1', role: 'waiter' } as const;
    await controller.create(RESTAURANT_ID, body);
    expect(users.create).toHaveBeenCalledWith(RESTAURANT_ID, body);
  });

  it('ativa e desativa no restaurante da rota, com o super admin como autor', async () => {
    const { controller, users } = setup();
    await controller.update(actor, RESTAURANT_ID, USER_ID, { active: false });
    expect(users.setActive).toHaveBeenCalledWith(RESTAURANT_ID, 'super-1', USER_ID, false);
  });

  it('edita o perfil no restaurante da rota, sem passar pelo ativar/desativar', async () => {
    const { controller, users } = setup();
    await controller.update(actor, RESTAURANT_ID, USER_ID, { name: 'Novo', role: 'cook' });
    expect(users.updateProfile).toHaveBeenCalledWith(RESTAURANT_ID, USER_ID, {
      name: 'Novo',
      role: 'cook',
    });
    expect(users.setActive).not.toHaveBeenCalled();
  });

  it('recusa restaurante inexistente ou interno antes de tocar nos usuários', async () => {
    const { controller, users } = setup(false);
    await expect(controller.list(RESTAURANT_ID)).rejects.toThrow(NotFoundException);
    await expect(
      controller.create(RESTAURANT_ID, { name: 'Ana', email: 'a@x.co', password: 'senha-bem-longa-1', role: 'cook' }),
    ).rejects.toThrow(NotFoundException);
    await expect(controller.update(actor, RESTAURANT_ID, USER_ID, { active: true })).rejects.toThrow(
      NotFoundException,
    );
    expect(users.list).not.toHaveBeenCalled();
    expect(users.create).not.toHaveBeenCalled();
    expect(users.setActive).not.toHaveBeenCalled();
  });
});
