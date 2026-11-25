import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REALTIME_EVENTS } from '@food-stack/shared';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { PLATFORM_RESTAURANT_ID } from '../restaurant/default-restaurant';
import { PlatformService } from './platform.service';

const createdAt = new Date('2026-11-25T12:00:00.000Z');
const record = { id: 'r1', name: 'Bistrô', tablesCount: 8, active: true, createdAt };

function setup(prisma: Record<string, unknown>) {
  const publish = vi.fn();
  const disconnectRestaurant = vi.fn();
  const service = new PlatformService(
    prisma as unknown as PrismaService,
    { publish, disconnectRestaurant } as unknown as RealtimeGateway,
  );
  return { service, publish, disconnectRestaurant };
}

describe('PlatformService.list', () => {
  it('lista os restaurantes sem o restaurante interno da plataforma', async () => {
    const findMany = vi.fn().mockResolvedValue([record]);
    const { service } = setup({ restaurant: { findMany } });

    const list = await service.list();

    expect(list).toEqual([
      { id: 'r1', name: 'Bistrô', tablesCount: 8, active: true, createdAt: '2026-11-25T12:00:00.000Z' },
    ]);
    expect(findMany.mock.calls[0]?.[0].where).toEqual({ id: { not: PLATFORM_RESTAURANT_ID } });
  });
});

describe('PlatformService.create', () => {
  const input = {
    name: 'Bistrô',
    tablesCount: 8,
    manager: { name: 'Marta', email: 'marta@bistro.co', password: 'senha-bem-longa-1' },
  };

  it('recusa e-mail que já pertence a outro usuário', async () => {
    const create = vi.fn();
    const { service } = setup({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'u' }) },
      restaurant: { create },
    });
    await expect(service.create(input)).rejects.toThrow(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it('cria o restaurante vazio com o primeiro gerente e a senha só como hash', async () => {
    const create = vi.fn().mockResolvedValue(record);
    const { service } = setup({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      restaurant: { create },
    });

    const created = await service.create(input);

    expect(created.id).toBe('r1');
    const data = create.mock.calls[0]?.[0].data;
    expect(data.name).toBe('Bistrô');
    expect(data.tablesCount).toBe(8);
    const manager = data.users.create;
    expect(manager.role).toBe('manager');
    expect(manager.email).toBe('marta@bistro.co');
    expect(manager.passwordHash).not.toContain('senha-bem-longa-1');
    expect(manager.passwordHash.length).toBeGreaterThan(20);
    expect(data.menuItems).toBeUndefined();
  });

  it('e-mail repetido numa corrida também vira Conflict', async () => {
    const { service } = setup({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      restaurant: { create: vi.fn().mockRejectedValue({ code: 'P2002' }) },
    });
    await expect(service.create(input)).rejects.toThrow(ConflictException);
  });
});

describe('PlatformService.update', () => {
  const found = () => vi.fn().mockResolvedValue({ id: 'r1' });

  it('lança NotFound para restaurante inexistente ou o interno da plataforma', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const { service } = setup({ restaurant: { findFirst } });
    await expect(service.update(PLATFORM_RESTAURANT_ID, { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
    expect(findFirst.mock.calls[0]?.[0].where).toEqual({
      id: PLATFORM_RESTAURANT_ID,
      NOT: { id: PLATFORM_RESTAURANT_ID },
    });
  });

  it('altera o nome sem derrubar ninguém', async () => {
    const deleteMany = vi.fn();
    const { service, publish, disconnectRestaurant } = setup({
      restaurant: {
        findFirst: found(),
        update: vi.fn().mockResolvedValue({ ...record, name: 'Novo' }),
      },
      session: { deleteMany },
    });

    const updated = await service.update('r1', { name: 'Novo' });

    expect(updated.name).toBe('Novo');
    expect(deleteMany).not.toHaveBeenCalled();
    expect(disconnectRestaurant).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('avisa as telas abertas quando muda a quantidade de mesas', async () => {
    const { service, publish } = setup({
      restaurant: {
        findFirst: found(),
        update: vi.fn().mockResolvedValue({ ...record, tablesCount: 20 }),
      },
    });
    await service.update('r1', { tablesCount: 20 });
    expect(publish).toHaveBeenCalledWith('r1', REALTIME_EVENTS.settingsChanged, { tablesCount: 20 });
  });

  it('ao desativar, apaga as sessões e derruba os sockets do restaurante', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const { service, disconnectRestaurant } = setup({
      restaurant: {
        findFirst: found(),
        update: vi.fn().mockResolvedValue({ ...record, active: false }),
      },
      session: { deleteMany },
    });

    const updated = await service.update('r1', { active: false });

    expect(updated.active).toBe(false);
    expect(deleteMany).toHaveBeenCalledWith({ where: { user: { restaurantId: 'r1' } } });
    expect(disconnectRestaurant).toHaveBeenCalledWith('r1');
  });

  it('reativar não derruba ninguém', async () => {
    const deleteMany = vi.fn();
    const { service, disconnectRestaurant } = setup({
      restaurant: { findFirst: found(), update: vi.fn().mockResolvedValue(record) },
      session: { deleteMany },
    });
    await service.update('r1', { active: true });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(disconnectRestaurant).not.toHaveBeenCalled();
  });
});
