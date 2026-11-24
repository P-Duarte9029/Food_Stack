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
