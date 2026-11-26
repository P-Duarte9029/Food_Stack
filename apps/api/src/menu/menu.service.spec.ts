import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REALTIME_EVENTS } from '@food-stack/shared';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { MenuService } from './menu.service';

const RESTAURANT_ID = 'restaurant-1';
const input = { name: 'Batata frita', category: 'porções', sizes: ['Média', 'Grande'] };

function setup(updated: number) {
  const updateMany = vi.fn().mockResolvedValue({ count: updated });
  const findMany = vi.fn().mockResolvedValue([{ category: 'Porções' }]);
  const findFirstOrThrow = vi.fn().mockResolvedValue({ id: 'm1', ...input, category: 'Porções' });
  const publish = vi.fn();
  const service = new MenuService(
    { menuItem: { updateMany, findMany, findFirstOrThrow } } as unknown as PrismaService,
    { publish } as unknown as RealtimeGateway,
  );
  return { service, updateMany, publish };
}

describe('MenuService.update', () => {
  it('atualiza só dentro do restaurante, reaproveita a grafia da categoria e publica', async () => {
    const { service, updateMany, publish } = setup(1);

    await service.update(RESTAURANT_ID, 'm1', input);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'm1', restaurantId: RESTAURANT_ID },
      data: { ...input, category: 'Porções' },
    });
    expect(publish).toHaveBeenCalledWith(RESTAURANT_ID, REALTIME_EVENTS.menuChanged, expect.anything());
  });

  it('recusa prato inexistente ou de outro restaurante', async () => {
    const { service, publish } = setup(0);

    await expect(service.update(RESTAURANT_ID, 'm1', input)).rejects.toBeInstanceOf(NotFoundException);
    expect(publish).not.toHaveBeenCalled();
  });
});
