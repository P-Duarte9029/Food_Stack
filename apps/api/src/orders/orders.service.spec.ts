import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REALTIME_EVENTS, type OrderStatus } from '@food-stack/shared';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';
import { toOrder } from './order.mapper';
import { OrdersService } from './orders.service';

const createdAt = new Date('2026-11-24T12:00:00.000Z');

const record = (status: OrderStatus) => ({
  id: 'order-1',
  table: 3,
  status,
  createdAt,
  items: [{ menuItemId: 'm1', name: 'Pudim', quantity: 2 }],
});

function setup(prisma: Record<string, unknown>) {
  const publish = vi.fn();
  const service = new OrdersService(
    prisma as unknown as PrismaService,
    { publish } as unknown as RealtimeGateway,
  );
  return { service, publish };
}

describe('toOrder', () => {
  it('converte o registro para o contrato compartilhado', () => {
    expect(toOrder(record('placed'))).toEqual({
      id: 'order-1',
      table: 3,
      status: 'placed',
      createdAt: '2026-11-24T12:00:00.000Z',
      items: [{ menuItemId: 'm1', name: 'Pudim', quantity: 2 }],
    });
  });
});

describe('OrdersService.create', () => {
  const input = { table: 3, items: [{ menuItemId: 'm1', name: 'ignorado', quantity: 2 }] };

  it('rejeita mesa acima da quantidade configurada', async () => {
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 2 }) },
    });
    await expect(service.create(input)).rejects.toThrow(BadRequestException);
  });

  it('rejeita item que não existe no cardápio', async () => {
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      menuItem: { findMany: vi.fn().mockResolvedValue([]) },
    });
    await expect(service.create(input)).rejects.toThrow(BadRequestException);
  });

  it('usa o nome do cardápio e publica order:created', async () => {
    const create = vi.fn().mockResolvedValue(record('placed'));
    const { service, publish } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim' }]) },
      order: { create },
    });

    const order = await service.create(input);

    expect(create.mock.calls[0]?.[0].data.items.create).toEqual([
      { menuItemId: 'm1', name: 'Pudim', quantity: 2 },
    ]);
    expect(publish).toHaveBeenCalledWith(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderCreated, order);
  });
});

describe('OrdersService.advance', () => {
  it('lança NotFound para pedido inexistente', async () => {
    const { service } = setup({ order: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.advance('x')).rejects.toThrow(NotFoundException);
  });

  it('lança Conflict quando o pedido já está pronto', async () => {
    const { service } = setup({
      order: { findFirst: vi.fn().mockResolvedValue({ status: 'ready' }) },
    });
    await expect(service.advance('x')).rejects.toThrow(ConflictException);
  });

  it('lança Conflict quando outro cliente mudou o status antes', async () => {
    const { service } = setup({
      order: {
        findFirst: vi.fn().mockResolvedValue({ status: 'placed' }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    });
    await expect(service.advance('x')).rejects.toThrow(ConflictException);
  });

  it('avança o status e publica order:updated', async () => {
    const { service, publish } = setup({
      order: {
        findFirst: vi.fn().mockResolvedValue({ status: 'placed' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(record('in_preparation')),
      },
    });

    const order = await service.advance('order-1');

    expect(order.status).toBe('in_preparation');
    expect(publish).toHaveBeenCalledWith(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderUpdated, order);
  });
});
