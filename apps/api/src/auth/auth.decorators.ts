import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '@food-stack/shared';
import type { AuthUser } from './session.service';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

export type AuthenticatedRequest = Request & { user?: AuthUser };

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error('CurrentUser usado em rota sem autenticação');
  return user;
});
