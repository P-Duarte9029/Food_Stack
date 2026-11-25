import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { REALTIME_EVENTS } from '@food-stack/shared';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';
import { TableSessionsService } from './table-sessions.service';

const openedAt = new Date('2026-11-25T12:00:00.000Z');
const record = { id: 'session-1', table: 4, customerName: 'Ana', openedAt };
const clientId = '6f1d2c3e-1111-4222-8333-444455556666';

function setup(prisma: Record<string, unknown>) {
  const publish = vi.fn();
  const service = new TableSessionsService(
    prisma as unknown as PrismaService,
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

  it('cria a sessão com a chave de mesa aberta e publica a lista', async () => {
    const create = vi.fn().mockResolvedValue(record);
    const { service, publish } = setup({
      restaurant: restaurant(),
      tableSession: { create, findMany: vi.fn().mockResolvedValue([record]) },
    });

    const session = await service.open(DEFAULT_RESTAURANT_ID, input);

    expect(session).toEqual({
      id: 'session-1',
      table: 4,
      customerName: 'Ana',
      openedAt: '2026-11-25T12:00:00.000Z',
    });
    expect(create.mock.calls[0]?.[0].data.openTableKey).toBe(`${DEFAULT_RESTAURANT_ID}:4`);
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
  it('fecha, libera a chave da mesa e publica a lista', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const { service, publish } = setup({
      tableSession: { updateMany, findMany: vi.fn().mockResolvedValue([]) },
    });

    await service.close(DEFAULT_RESTAURANT_ID, 'session-1');

    const call = updateMany.mock.calls[0]?.[0];
    expect(call.where).toEqual({ id: 'session-1', restaurantId: DEFAULT_RESTAURANT_ID, closedAt: null });
    expect(call.data.openTableKey).toBeNull();
    expect(call.data.closedAt).toBeInstanceOf(Date);
    expect(publish).toHaveBeenCalledWith(
      DEFAULT_RESTAURANT_ID,
      REALTIME_EVENTS.tableSessionsChanged,
      [],
    );
  });

  it('fechar uma mesa já fechada não é erro nem publica de novo', async () => {
    const { service, publish } = setup({
      tableSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn().mockResolvedValue({ id: 'session-1' }),
      },
    });
    await expect(service.close(DEFAULT_RESTAURANT_ID, 'session-1')).resolves.toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
  });

  it('lança NotFound para sessão de outro restaurante ou inexistente', async () => {
    const { service } = setup({
      tableSession: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    await expect(service.close(DEFAULT_RESTAURANT_ID, 'x')).rejects.toThrow(NotFoundException);
  });
});
