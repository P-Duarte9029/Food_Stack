import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REALTIME_EVENTS } from '@food-stack/shared';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';
import { TableSessionsService } from './table-sessions.service';

const openedAt = new Date('2026-11-25T12:00:00.000Z');
const record = {
  id: 'session-1',
  table: 4,
  customerName: 'Ana',
  openedAt,
  checks: [{ id: 'check-1', name: 'Ana' }],
};
const clientId = '6f1d2c3e-1111-4222-8333-444455556666';

function setup(prisma: Record<string, unknown>) {
  const publish = vi.fn();
  const service = new TableSessionsService(
    {
      // Transação em lote: resolve cada operação já criada, como o Prisma faz.
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
      ...prisma,
    } as unknown as PrismaService,
    { publish } as unknown as RealtimeGateway,
  );
  return { service, publish };
}

const restaurant = (tablesCount = 10) => ({
  findUniqueOrThrow: vi.fn().mockResolvedValue({ tablesCount }),
});

describe('TableSessionsService.open', () => {
  const input = { table: 4, customerName: 'Ana' };

  it('rejeita mesa acima da quantidade configurada', async () => {
    const { service } = setup({ restaurant: restaurant(3) });
    await expect(service.open(DEFAULT_RESTAURANT_ID, input)).rejects.toThrow(BadRequestException);
  });

  it('cria a sessão com a chave de mesa aberta e a primeira comanda, e publica a lista', async () => {
    const create = vi.fn().mockResolvedValue(record);
    const { service, publish } = setup({
      restaurant: restaurant(),
      tableSession: { create, findMany: vi.fn().mockResolvedValue([record]) },
    });

    const session = await service.open(DEFAULT_RESTAURANT_ID, { ...input, checkId: clientId });

    expect(session).toEqual({
      id: 'session-1',
      table: 4,
      customerName: 'Ana',
      openedAt: '2026-11-25T12:00:00.000Z',
      checks: [{ id: 'check-1', name: 'Ana' }],
    });
    const data = create.mock.calls[0]?.[0].data;
    expect(data.openTableKey).toBe(`${DEFAULT_RESTAURANT_ID}:4`);
    expect(data.checks).toEqual({ create: { id: clientId, name: 'Ana' } });
    expect(publish).toHaveBeenCalledWith(
      DEFAULT_RESTAURANT_ID,
      REALTIME_EVENTS.tableSessionsChanged,
      [session],
    );
  });

  it('responde Conflict quando a mesa já está aberta', async () => {
    const { service, publish } = setup({
      restaurant: restaurant(),
      tableSession: { create: vi.fn().mockRejectedValue({ code: 'P2002' }) },
    });
    await expect(service.open(DEFAULT_RESTAURANT_ID, input)).rejects.toThrow(ConflictException);
    expect(publish).not.toHaveBeenCalled();
  });

  it('reenvio com o mesmo id devolve a sessão sem criar outra', async () => {
    const create = vi.fn();
    const { service, publish } = setup({
      tableSession: {
        findUnique: vi.fn().mockResolvedValue({ ...record, restaurantId: DEFAULT_RESTAURANT_ID }),
        create,
      },
    });

    const session = await service.open(DEFAULT_RESTAURANT_ID, { ...input, id: clientId });

    expect(session.id).toBe('session-1');
    expect(create).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('em corrida com o mesmo id devolve a sessão que venceu', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...record, restaurantId: DEFAULT_RESTAURANT_ID });
    const { service } = setup({
      restaurant: restaurant(),
      tableSession: { findUnique, create: vi.fn().mockRejectedValue({ code: 'P2002' }) },
    });

    const session = await service.open(DEFAULT_RESTAURANT_ID, { ...input, id: clientId });

    expect(session.id).toBe('session-1');
  });

  it('recusa identificador já usado por outro restaurante', async () => {
    const { service } = setup({
      tableSession: {
        findUnique: vi.fn().mockResolvedValue({ ...record, restaurantId: 'outro' }),
      },
    });
    await expect(
      service.open(DEFAULT_RESTAURANT_ID, { ...input, id: clientId }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('TableSessionsService.close', () => {
  const closing = (sessionCount: number) => {
    const sessionUpdate = vi.fn().mockResolvedValue({ count: sessionCount });
    const checksUpdate = vi.fn().mockResolvedValue({ count: 2 });
    return { sessionUpdate, checksUpdate };
  };

  it('fecha a mesa e todas as comandas abertas, libera a chave e publica a lista', async () => {
    const { sessionUpdate, checksUpdate } = closing(1);
    const { service, publish } = setup({
      tableSession: { updateMany: sessionUpdate, findMany: vi.fn().mockResolvedValue([]) },
      guestCheck: { updateMany: checksUpdate },
    });

    await service.close(DEFAULT_RESTAURANT_ID, 'session-1');

    const call = sessionUpdate.mock.calls[0]?.[0];
    expect(call.where).toEqual({ id: 'session-1', restaurantId: DEFAULT_RESTAURANT_ID, closedAt: null });
    expect(call.data.openTableKey).toBeNull();
    expect(call.data.closedAt).toBeInstanceOf(Date);
    expect(checksUpdate.mock.calls[0]?.[0].where).toEqual({
      tableSessionId: 'session-1',
      closedAt: null,
      tableSession: { restaurantId: DEFAULT_RESTAURANT_ID },
    });
    expect(publish).toHaveBeenCalledWith(
      DEFAULT_RESTAURANT_ID,
      REALTIME_EVENTS.tableSessionsChanged,
      [],
    );
  });

  it('fechar uma mesa já fechada não é erro nem publica de novo', async () => {
    const { sessionUpdate, checksUpdate } = closing(0);
    const { service, publish } = setup({
      tableSession: {
        updateMany: sessionUpdate,
        findFirst: vi.fn().mockResolvedValue({ id: 'session-1' }),
      },
      guestCheck: { updateMany: checksUpdate },
    });
    await expect(service.close(DEFAULT_RESTAURANT_ID, 'session-1')).resolves.toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
  });

  it('lança NotFound para sessão de outro restaurante ou inexistente', async () => {
    const { sessionUpdate, checksUpdate } = closing(0);
    const { service } = setup({
      tableSession: { updateMany: sessionUpdate, findFirst: vi.fn().mockResolvedValue(null) },
      guestCheck: { updateMany: checksUpdate },
    });
    await expect(service.close(DEFAULT_RESTAURANT_ID, 'x')).rejects.toThrow(NotFoundException);
  });
});

describe('TableSessionsService.addCheck', () => {
  const input = { name: 'Beto' };
  const sessionWith = (checks: Array<{ id: string }>) =>
    vi.fn().mockResolvedValue({ customerName: 'Ana', checks });

  it('cria a comanda e publica a lista', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'check-2', name: 'Beto' });
    const { service, publish } = setup({
      tableSession: {
        findFirst: sessionWith([{ id: 'check-1' }]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      guestCheck: { create },
    });

    const check = await service.addCheck(DEFAULT_RESTAURANT_ID, 'session-1', input);

    expect(check).toEqual({ id: 'check-2', name: 'Beto' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalled();
  });

  it('em mesa aberta antes das comandas, quem abriu vira a primeira comanda', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: 'padrao', name: 'Ana' })
      .mockResolvedValueOnce({ id: 'check-2', name: 'Beto' });
    const { service } = setup({
      tableSession: { findFirst: sessionWith([]), findMany: vi.fn().mockResolvedValue([]) },
      guestCheck: { create },
    });

    const check = await service.addCheck(DEFAULT_RESTAURANT_ID, 'session-1', input);

    expect(create.mock.calls[0]?.[0].data.name).toBe('Ana');
    expect(check.name).toBe('Beto');
  });

  it('lança NotFound quando a mesa não está aberta', async () => {
    const { service } = setup({
      tableSession: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    await expect(service.addCheck(DEFAULT_RESTAURANT_ID, 'session-1', input)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reenvio com o mesmo id devolve a comanda sem criar outra', async () => {
    const create = vi.fn();
    const { service, publish } = setup({
      guestCheck: {
        findUnique: vi.fn().mockResolvedValue({
          id: clientId,
          name: 'Beto',
          tableSession: { restaurantId: DEFAULT_RESTAURANT_ID },
        }),
        create,
      },
    });

    const check = await service.addCheck(DEFAULT_RESTAURANT_ID, 'session-1', { ...input, id: clientId });

    expect(check).toEqual({ id: clientId, name: 'Beto' });
    expect(create).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('recusa identificador de comanda de outro restaurante', async () => {
    const { service } = setup({
      guestCheck: {
        findUnique: vi.fn().mockResolvedValue({
          id: clientId,
          name: 'Beto',
          tableSession: { restaurantId: 'outro' },
        }),
      },
    });
    await expect(
      service.addCheck(DEFAULT_RESTAURANT_ID, 'session-1', { ...input, id: clientId }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('TableSessionsService.closeCheck', () => {
  it('fecha só a comanda quando ainda há outras abertas', async () => {
    const sessionUpdate = vi.fn();
    const { service, publish } = setup({
      tableSession: { updateMany: sessionUpdate, findMany: vi.fn().mockResolvedValue([]) },
      guestCheck: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        count: vi.fn().mockResolvedValue(1),
      },
    });

    await service.closeCheck(DEFAULT_RESTAURANT_ID, 'session-1', 'check-1');

    expect(sessionUpdate).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalled();
  });

  it('fechar a última comanda fecha também a mesa', async () => {
    const sessionUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const checksUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const { service } = setup({
      tableSession: { updateMany: sessionUpdate, findMany: vi.fn().mockResolvedValue([]) },
      guestCheck: { updateMany: checksUpdate, count: vi.fn().mockResolvedValue(0) },
    });

    await service.closeCheck(DEFAULT_RESTAURANT_ID, 'session-1', 'check-1');

    expect(sessionUpdate).toHaveBeenCalledTimes(1);
    expect(sessionUpdate.mock.calls[0]?.[0].data.openTableKey).toBeNull();
  });

  it('só fecha comanda da própria mesa e restaurante', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const { service } = setup({
      guestCheck: { updateMany, findFirst: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.closeCheck(DEFAULT_RESTAURANT_ID, 'session-1', 'check-x'),
    ).rejects.toThrow(NotFoundException);
    expect(updateMany.mock.calls[0]?.[0].where).toEqual({
      id: 'check-x',
      tableSessionId: 'session-1',
      closedAt: null,
      tableSession: { restaurantId: DEFAULT_RESTAURANT_ID, closedAt: null },
    });
  });

  it('fechar comanda já fechada não é erro nem publica de novo', async () => {
    const { service, publish } = setup({
      guestCheck: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn().mockResolvedValue({ id: 'check-1' }),
      },
    });
    await expect(
      service.closeCheck(DEFAULT_RESTAURANT_ID, 'session-1', 'check-1'),
    ).resolves.toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
  });
});
