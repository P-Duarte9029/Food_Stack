import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
      notes: null,
      items: [{ menuItemId: 'm1', name: 'Pudim', size: null, quantity: 2 }],
    });
  });

  it('expõe a observação para a cozinha', () => {
    expect(toOrder({ ...record('placed'), notes: 'sem cebola' }).notes).toBe('sem cebola');
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
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim', sizes: [] }]) },
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
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim', sizes: [] }]) },
      order: { create },
    });

    const order = await service.create(DEFAULT_RESTAURANT_ID, USER_ID, input);

    expect(create.mock.calls[0]?.[0].data.items.create).toEqual([
      { menuItemId: 'm1', name: 'Pudim', size: null, quantity: 2 },
    ]);
    expect(create.mock.calls[0]?.[0].data.tableSessionId).toBe('session-1');
    expect(create.mock.calls[0]?.[0].data.checkId).toBe('check-1');
    expect(create.mock.calls[0]?.[0].data.createdById).toBe(USER_ID);
    expect(publish).toHaveBeenCalledWith(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.orderCreated, order);
  });

  it.each([
    ['grava a observação', 'sem cebola', 'sem cebola'],
    ['grava nulo quando não há observação', undefined, null],
    ['grava nulo quando a observação é vazia', '', null],
  ])('%s', async (_name, notes, expected) => {
    const create = vi.fn().mockResolvedValue(record('placed'));
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: openSession,
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim', sizes: [] }]) },
      order: { create },
    });

    await service.create(DEFAULT_RESTAURANT_ID, USER_ID, { ...input, notes });

    expect(create.mock.calls[0]?.[0].data.notes).toBe(expected);
  });
});

describe('OrdersService.create (tamanhos)', () => {
  const sizedMenu = [{ id: 'm1', name: 'Batata frita', sizes: ['Pequena', 'Grande'] }];

  const run = (items: Array<{ menuItemId: string; name: string; size?: string; quantity: number }>, menu = sizedMenu) => {
    const create = vi.fn().mockResolvedValue(record('placed'));
    const { service } = setup({
      restaurant: { findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount: 10 }) },
      tableSession: openSession,
      menuItem: { findMany: vi.fn().mockResolvedValue(menu) },
      order: { create },
    });
    return { create, result: service.create(DEFAULT_RESTAURANT_ID, USER_ID, { table: 3, items }) };
  };

  it('grava uma linha por tamanho, com a grafia do cardápio', async () => {
    const { create, result } = run([
      { menuItemId: 'm1', name: 'x', size: 'grande', quantity: 1 },
      { menuItemId: 'm1', name: 'x', size: 'Pequena', quantity: 2 },
      { menuItemId: 'm1', name: 'x', size: 'Grande', quantity: 1 },
    ]);
    await result;
    expect(create.mock.calls[0]?.[0].data.items.create).toEqual([
      { menuItemId: 'm1', name: 'Batata frita', size: 'Grande', quantity: 2 },
      { menuItemId: 'm1', name: 'Batata frita', size: 'Pequena', quantity: 2 },
    ]);
  });

  it('exige o tamanho quando o prato tem tamanhos', async () => {
    await expect(run([{ menuItemId: 'm1', name: 'x', quantity: 1 }]).result).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa tamanho que o prato não tem', async () => {
    await expect(
      run([{ menuItemId: 'm1', name: 'x', size: 'Gigante', quantity: 1 }]).result,
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa tamanho em prato sem tamanhos', async () => {
    await expect(
      run([{ menuItemId: 'm1', name: 'x', size: 'Grande', quantity: 1 }], [
        { id: 'm1', name: 'Pudim', sizes: [] },
      ]).result,
    ).rejects.toBeInstanceOf(BadRequestException);
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
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim', sizes: [] }]) },
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
      menuItem: { findMany: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Pudim', sizes: [] }]) },
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

describe('OrdersService.deliver', () => {
  const waiter = { id: 'user-1', role: 'waiter' } as const;
  const manager = { id: 'user-9', role: 'manager' } as const;
  const owned = (status: OrderStatus, createdById: string | null = 'user-1') => ({
    status,
    createdById,
  });

  const withOrder = (current: ReturnType<typeof owned> | null, updated = { count: 1 }) => {
    const updateMany = vi.fn().mockResolvedValue(updated);
    const { service, publish } = setup({
      order: {
        findFirst: vi.fn().mockResolvedValue(current),
        updateMany,
        findUniqueOrThrow: vi.fn().mockResolvedValue(record('delivered')),
      },
    });
    return { service, publish, updateMany };
  };

  it('lança NotFound para pedido inexistente', async () => {
    const { service } = withOrder(null);
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'x')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('o atendente que criou marca como entregue e publica order:updated', async () => {
    const { service, publish, updateMany } = withOrder(owned('ready'));

    const order = await service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'order-1');

    expect(order.status).toBe('delivered');
    expect(updateMany.mock.calls[0]?.[0]).toEqual({
      where: { id: 'order-1', restaurantId: DEFAULT_RESTAURANT_ID, status: 'ready' },
      data: { status: 'delivered' },
    });
    expect(publish).toHaveBeenCalledWith(
      DEFAULT_RESTAURANT_ID,
      REALTIME_EVENTS.orderUpdated,
      order,
    );
  });

  it('o gerente pode entregar pedido de outro atendente', async () => {
    const { service } = withOrder(owned('ready', 'user-1'));
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, manager, 'order-1')).resolves.toBeDefined();
  });

  it('recusa atendente que não criou o pedido', async () => {
    const { service, updateMany } = withOrder(owned('ready', 'outro'));
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'order-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('pedido antigo, sem autor, só o gerente entrega', async () => {
    const { service } = withOrder(owned('ready', null));
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'order-1')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, manager, 'order-1')).resolves.toBeDefined();
  });

  it('recusa pedido que ainda não está pronto', async () => {
    const { service, updateMany } = withOrder(owned('in_preparation'));
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'order-1')).rejects.toThrow(
      ConflictException,
    );
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('entregar de novo devolve o pedido sem atualizar nem publicar', async () => {
    const { service, publish, updateMany } = withOrder(owned('delivered'));
    const order = await service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'order-1');
    expect(order.status).toBe('delivered');
    expect(updateMany).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('lança Conflict quando outro cliente mudou o status antes', async () => {
    const { service } = withOrder(owned('ready'), { count: 0 });
    await expect(service.deliver(DEFAULT_RESTAURANT_ID, waiter, 'order-1')).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('OrdersService.advance (entregue)', () => {
  it('a cozinha não avança um pedido já entregue', async () => {
    const { service } = setup({
      order: { findFirst: vi.fn().mockResolvedValue({ status: 'delivered' }) },
    });
    await expect(service.advance(DEFAULT_RESTAURANT_ID, 'x')).rejects.toThrow(
      'O pedido já foi entregue',
    );
  });
});
