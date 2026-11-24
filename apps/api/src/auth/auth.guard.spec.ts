import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { Role } from '@food-stack/shared';
import { IS_PUBLIC, ROLES } from './auth.decorators';
import { AuthGuard } from './auth.guard';
import type { AuthUser, SessionService } from './session.service';

function setup(options: { isPublic?: boolean; roles?: Role[]; user: AuthUser | null; cookie?: string }) {
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => (key === IS_PUBLIC ? options.isPublic : options.roles)),
  } as unknown as Reflector;
  const validate = vi.fn().mockResolvedValue(options.user);
  const guard = new AuthGuard(reflector, { validate } as unknown as SessionService);
  const request: { headers: { cookie?: string }; user?: AuthUser } = {
    headers: { cookie: options.cookie ?? 'fs_session=tok' },
  };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard, context, request, validate };
}

const cook: AuthUser = { id: 'u', restaurantId: 'r', name: 'C', email: 'c@x.co', role: 'cook' };

describe('AuthGuard', () => {
  it('libera rota pública sem consultar a sessão', async () => {
    const { guard, context, validate } = setup({ isPublic: true, user: null });
    expect(await guard.canActivate(context)).toBe(true);
    expect(validate).not.toHaveBeenCalled();
  });

  it('exige sessão válida', async () => {
    const { guard, context } = setup({ user: null });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('anexa o usuário e libera quando o papel é permitido', async () => {
    const { guard, context, request } = setup({ roles: ['cook', 'manager'], user: cook });
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual(cook);
  });

  it('bloqueia papel sem permissão', async () => {
    const { guard, context } = setup({ roles: ['manager'], user: cook });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('metadados usados existem', () => {
    expect([IS_PUBLIC, ROLES]).toEqual(['isPublic', 'roles']);
  });
});
