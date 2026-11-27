import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SessionService } from '../auth/session.service';
import type { PrismaService } from '../prisma.service';
import type { RealtimeGateway } from '../realtime/realtime.gateway';
import { UsersService } from './users.service';

const manager = { id: 'm1', name: 'Ana', email: 'ana@x.co', role: 'manager', active: true };

function setup(prisma: Record<string, unknown>) {
  const destroyAllOf = vi.fn();
  const disconnectUser = vi.fn();
  const service = new UsersService(
    prisma as unknown as PrismaService,
    { destroyAllOf } as unknown as SessionService,
    { disconnectUser } as unknown as RealtimeGateway,
  );
  return { service, destroyAllOf, disconnectUser };
}

describe('UsersService.create', () => {
  it('rejeita e-mail já cadastrado', async () => {
    const { service } = setup({ user: { findUnique: vi.fn().mockResolvedValue({ id: 'x' }) } });
    await expect(
      service.create('r1', { name: 'B', email: 'ana@x.co', password: '1234567890', role: 'cook' }),
    ).rejects.toThrow(ConflictException);
  });

  it('grava o hash da senha, nunca a senha', async () => {
    const create = vi.fn().mockResolvedValue({});
    const { service } = setup({
      user: { findUnique: vi.fn().mockResolvedValue(null), create },
    });
    await service.create('r1', { name: 'B', email: 'b@x.co', password: '1234567890', role: 'cook' });
    const data = create.mock.calls[0]?.[0].data;
    expect(data.passwordHash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(data)).not.toContain('1234567890');
  });
});

describe('UsersService.setActive', () => {
  it('lança NotFound para usuário de outro restaurante ou inexistente', async () => {
    const { service } = setup({ user: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(service.setActive('r1', 'm1', 'zzz', false)).rejects.toThrow(NotFoundException);
  });

  it('não deixa desativar o próprio usuário', async () => {
    const { service } = setup({ user: { findFirst: vi.fn().mockResolvedValue(manager) } });
    await expect(service.setActive('r1', 'm1', 'm1', false)).rejects.toThrow(BadRequestException);
  });

  it('não deixa desativar o último gerente ativo', async () => {
    const { service } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue({ ...manager, id: 'm2' }),
        count: vi.fn().mockResolvedValue(1),
      },
    });
    await expect(service.setActive('r1', 'm1', 'm2', false)).rejects.toThrow(BadRequestException);
  });

  it('desativar encerra sessões e derruba os sockets do usuário', async () => {
    const { service, destroyAllOf, disconnectUser } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue({ ...manager, id: 'c1', role: 'cook' }),
        update: vi.fn().mockResolvedValue({ ...manager, id: 'c1', role: 'cook', active: false }),
      },
    });
    await service.setActive('r1', 'm1', 'c1', false);
    expect(destroyAllOf).toHaveBeenCalledWith('c1');
    expect(disconnectUser).toHaveBeenCalledWith('c1');
  });
});

describe('UsersService.updateProfile', () => {
  const cook = { id: 'c1', name: 'Caio', email: 'caio@x.co', role: 'cook', active: true };

  it('lança NotFound para usuário de outro restaurante ou inexistente', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const { service } = setup({ user: { findFirst } });
    await expect(service.updateProfile('r1', 'zzz', { name: 'X' })).rejects.toThrow(NotFoundException);
    expect(findFirst.mock.calls[0]?.[0].where).toEqual({ id: 'zzz', restaurantId: 'r1' });
  });

  it('muda só o nome sem derrubar sessões', async () => {
    const update = vi.fn().mockResolvedValue({ ...cook, name: 'Novo' });
    const { service, destroyAllOf, disconnectUser } = setup({
      user: { findFirst: vi.fn().mockResolvedValue(cook), update },
    });

    await service.updateProfile('r1', 'c1', { name: 'Novo' });

    expect(update.mock.calls[0]?.[0].data).toEqual({
      name: 'Novo',
      email: undefined,
      role: undefined,
      passwordHash: undefined,
    });
    expect(destroyAllOf).not.toHaveBeenCalled();
    expect(disconnectUser).not.toHaveBeenCalled();
  });

  it('recusa e-mail que já pertence a outro usuário', async () => {
    const update = vi.fn();
    const { service } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue(cook),
        findUnique: vi.fn().mockResolvedValue({ id: 'outro' }),
        update,
      },
    });
    await expect(service.updateProfile('r1', 'c1', { email: 'ana@x.co' })).rejects.toThrow(
      ConflictException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('não consulta e-mail quando ele não muda', async () => {
    const findUnique = vi.fn();
    const { service } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue(cook),
        findUnique,
        update: vi.fn().mockResolvedValue(cook),
      },
    });
    await service.updateProfile('r1', 'c1', { email: 'caio@x.co' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('não rebaixa o último gerente ativo', async () => {
    const update = vi.fn();
    const { service } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue(manager),
        count: vi.fn().mockResolvedValue(0),
        update,
      },
    });
    await expect(service.updateProfile('r1', 'm1', { role: 'waiter' })).rejects.toThrow(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('rebaixa um gerente quando há outro ativo e encerra as sessões', async () => {
    const count = vi.fn().mockResolvedValue(1);
    const { service, destroyAllOf, disconnectUser } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue(manager),
        count,
        update: vi.fn().mockResolvedValue({ ...manager, role: 'waiter' }),
      },
    });

    await service.updateProfile('r1', 'm1', { role: 'waiter' });

    expect(count.mock.calls[0]?.[0].where).toEqual({
      restaurantId: 'r1',
      role: 'manager',
      active: true,
      id: { not: 'm1' },
    });
    expect(destroyAllOf).toHaveBeenCalledWith('m1');
    expect(disconnectUser).toHaveBeenCalledWith('m1');
  });

  it('redefine a senha gravando só o hash e encerra as sessões', async () => {
    const update = vi.fn().mockResolvedValue(cook);
    const { service, destroyAllOf } = setup({
      user: { findFirst: vi.fn().mockResolvedValue(cook), update },
    });

    await service.updateProfile('r1', 'c1', { password: 'nova-senha-longa-1' });

    const data = update.mock.calls[0]?.[0].data;
    expect(data.passwordHash).toMatch(/^scrypt\$/);
    expect(JSON.stringify(data)).not.toContain('nova-senha-longa-1');
    expect(destroyAllOf).toHaveBeenCalledWith('c1');
  });

  it('trata corrida de e-mail (violação de unicidade) como conflito', async () => {
    const { service } = setup({
      user: {
        findFirst: vi.fn().mockResolvedValue(cook),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockRejectedValue({ code: 'P2002' }),
      },
    });
    await expect(service.updateProfile('r1', 'c1', { email: 'novo@x.co' })).rejects.toThrow(
      ConflictException,
    );
  });
});
