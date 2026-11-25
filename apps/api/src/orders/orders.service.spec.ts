import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REALTIME_EVENTS, type OrderStatus } from '@food-stack/shared';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';
import { toOrder } from './order.mapper';
import { OrdersService } from './orders.service';

const createdAt = new Date('2026-11-24T12:00:00.000Z');
const USER_ID = 'user-1';

const record = (status: OrderStatus) => ({
  id: 'order-1',
  table: 3,
  status,
  createdAt,
  items: [{ menuItemId: 'm1', name: 'Pudim', quantity: 2 }],
});

const sessionWith = (checkIds: string[]) => ({
  findFirst: vi.fn().mockResolvedValue({ id: 'session-1', checks: checkIds.map((id) => ({ id })) }),
});
const openSession = sessionWith(['check-1']);

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
      customerName: null,
      createdById: null,
      createdByName: null,
      items: [{ menuItemId: 'm1', name: 'Pudim', quantity: 2 }],
    });
  });
});

describe('toOrder (atendente)', () => {
  it('expõe quem criou o pedido', () => {
    const order = toOrder({ ...record('placed'), createdById: 'user-1', createdBy: { name: 'Carla' } });
    expect(order.createdById).toBe('user-1');
    expect(order.createdByName).toBe('Carla');
  });

  it('pedidos antigos ficam sem autor', () => {
    const order = toOrder(record('placed'));
    expect(order.createdById).toBeNull();
    expect(order.createdByName).toBeNull();
  });
});

describe('toOrder (nome do cliente)', () => {
  it('prefere o nome da comanda ao de quem abriu a mesa', () => {
    const order = toOrder({
      ...record('placed'),
      tableSession: { customerName: 'Ana' },
      check: { name: 'Beto' },
    });
    expect(order.customerName).toBe('Beto');
  });

  it('cai no nome de quem abriu a mesa quando não há comanda', () => {
    const order = toOrder({ ...record('placed'), tableSession: { customerName: 'Ana' } });
    expect(order.customerName).toBe('Ana');
  });
});

describe('OrdersService.create', () => {
  const input = { table: 3, items: [{ menuItemId: 'm1', name: 'ignorado', quantity: 2 }] };

  it('rejeita mesa acima da quantidade configurada', async () => {
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 2 }) },
    });
    await expect(service.create(DEFAULT_RESTAURANT_ID, USER_ID, input)).rejects.toThrow(BadRequestException);
  });

  it('rejeita item que não existe no cardápio', async () => {
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: openSession,
      menuItem: { findMany: vi.fn().mockResolvedValue([]) },
    });
    await expect(service.create(DEFAULT_RESTAURANT_ID, USER_ID, input)).rejects.toThrow(BadRequestException);
  });

  it('rejeita pedido para mesa que não está aberta', async () => {
    const create = vi.fn();
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: { findFirst: vi.fn().mockResolvedValue(null) },
      order: { create },
    });
    await expect(service.create(DEFAULT_RESTAURANT_ID, USER_ID, input)).rejects.toThrow(
      'Abra a mesa antes de enviar o pedido',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('só aceita sessão aberta da mesma mesa e do mesmo restaurante', async () => {
    const findFirst = sessionWith(['check-1']).findFirst;
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: { findFirst },
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim' }]) },
      order: { create: vi.fn().mockResolvedValue(record('placed')) },
    });
    const sessionId = '6f1d2c3e-1111-4222-8333-444455556666';

    await service.create(DEFAULT_RESTAURANT_ID, USER_ID, { ...input, tableSessionId: sessionId });

    expect(findFirst.mock.calls[0]?.[0].where).toEqual({
      restaurantId: DEFAULT_RESTAURANT_ID,
      closedAt: null,
      table: 3,
      id: sessionId,
    });
  });

  it('usa o nome do cardápio e publica order:created', async () => {
    const create = vi.fn().mockResolvedValue(record('placed'));
    const { service, publish } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: openSession,
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim' }]) },
      order: { create },
    });

    const order = await service.create(DEFAULT_RESTAURANT_ID, USER_ID, input);

    expect(create.mock.calls[0]?.[0].data.items.create).toEqual([
      { menuItemId: 'm1', name: 'Pudim', quantity: 2 },
    ]);
    expect(create.mock.calls[0]?.[0].data.tableSessionId).toBe('session-1');
    expect(create.mock.calls[0]?.[0].data.checkId).toBe('check-1');
    expect(create.mock.calls[0]?.[0].data.createdById).toBe(USER_ID);
    expect(publish).toHaveBeenCalledWith(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderCreated, order);
  });
});

describe('OrdersService.create (comandas)', () => {
  const base = { table: 3, items: [{ menuItemId: 'm1', name: 'x', quantity: 1 }] };
  const checkId = '6f1d2c3e-1111-4222-8333-444455556666';

  const withSession = (checkIds: string[]) => {
    const create = vi.fn().mockResolvedValue(record('placed'));
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: sessionWith(checkIds),
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim' }]) },
      order: { create },
    });
    return { service, create };
  };

  it('grava o pedido na comanda informada', async () => {
    const { service, create } = withSession(['outra', checkId]);
    await service.create(DEFAULT_RESTAURANT_ID, USER_ID, { ...base, checkId });
    expect(create.mock.calls[0]?.[0].data.checkId).toBe(checkId);
  });

  it('recusa comanda que não está aberta na mesa', async () => {
    const { service, create } = withSession(['outra']);
    await expect(service.create(DEFAULT_RESTAURANT_ID, USER_ID, { ...base, checkId })).rejects.toThrow(
      'A comanda não está aberta',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('exige a comanda quando há mais de uma aberta', async () => {
    const { service, create } = withSession(['a', 'b']);
    await expect(service.create(DEFAULT_RESTAURANT_ID, USER_ID, base)).rejects.toThrow(
      'Informe a comanda do pedido',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('usa a única comanda aberta quando o pedido não informa', async () => {
    const { service, create } = withSession(['unica']);
    await service.create(DEFAULT_RESTAURANT_ID, USER_ID, base);
    expect(create.mock.calls[0]?.[0].data.checkId).toBe('unica');
  });

  it('mesa aberta antes das comandas recebe o pedido sem comanda', async () => {
    const { service, create } = withSession([]);
    await service.create(DEFAULT_RESTAURANT_ID, USER_ID, base);
    expect(create.mock.calls[0]?.[0].data.checkId).toBeNull();
  });
});

describe('OrdersService.create (reenvio idempotente)', () => {
  const clientId = '6f1d2c3e-1111-4222-8333-444455556666';
  const input = { id: clientId, table: 3, items: [{ menuItemId: 'm1', name: 'x', quantity: 2 }] };

  it('devolve o pedido já criado, sem criar outro nem publicar de novo', async () => {
    const create = vi.fn();
    const { service, publish } = setup({
      order: {
        findUnique: vi.fn().mockResolvedValue({ ...record('in_preparation'), restaurantId: DEFAULT_RESTAURANT_ID }),
        create,
      },
    });

    const order = await service.create(DEFAULT_RESTAURANT_ID, USER_ID, input);

    expect(order.status).toBe('in_preparation');
    expect(create).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('recusa identificador já usado por outro restaurante', async () => {
    const { service } = setup({
      order: {
        findUnique: vi.fn().mockResolvedValue({ ...record('placed'), restaurantId: 'outro' }),
      },
    });
    await expect(service.create(DEFAULT_RESTAURANT_ID, USER_ID, input)).rejects.toThrow(ConflictException);
  });

  it('em corrida (violação de unicidade) devolve o pedido que venceu', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...record('placed'), restaurantId: DEFAULT_RESTAURANT_ID });
    const { service, publish } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: openSession,
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim' }]) },
      order: { findUnique, create: vi.fn().mockRejectedValue({ code: 'P2002' }) },
    });

    const order = await service.create(DEFAULT_RESTAURANT_ID, USER_ID, input);

    expect(order.id).toBe('order-1');
    expect(publish).not.toHaveBeenCalled();
  });
});

describe('OrdersService.advance', () => {
  it('lança NotFound para pedido inexistente', async () => {
    const { service } = setup({ order: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.advance(DEFAULT_RESTAURANT_ID, 'x')).rejects.toThrow(NotFoundException);
  });

  it('lança Conflict quando o pedido já está pronto', async () => {
    const { service } = setup({
      order: { findFirst: vi.fn().mockResolvedValue({ status: 'ready' }) },
    });
    await expect(service.advance(DEFAULT_RESTAURANT_ID, 'x')).rejects.toThrow(ConflictException);
  });

  it('lança Conflict quando outro cliente mudou o status antes', async () => {
    const { service } = setup({
      order: {
        findFirst: vi.fn().mockResolvedValue({ status: 'placed' }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    });
    await expect(service.advance(DEFAULT_RESTAURANT_ID, 'x')).rejects.toThrow(ConflictException);
  });

  it('avança o status e publica order:updated', async () => {
    const { service, publish } = setup({
      order: {
        findFirst: vi.fn().mockResolvedValue({ status: 'placed' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(record('in_preparation')),
      },
    });

    const order = await service.advance(DEFAULT_RESTAURANT_ID, 'order-1');

    expect(order.status).toBe('in_preparation');
    expect(publish).toHaveBeenCalledWith(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderUpdated, order);
  });
});
