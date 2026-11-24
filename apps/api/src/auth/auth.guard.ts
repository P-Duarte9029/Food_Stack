import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@food-stack/shared';
import { IS_PUBLIC, ROLES, type AuthenticatedRequest } from './auth.decorators';
import { readCookie, SESSION_COOKIE } from './cookies';
import { SessionService } from './session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.sessions.validate(readCookie(request.headers.cookie, SESSION_COOKIE));
    if (!user) throw new UnauthorizedException('Faça login para continuar');
    request.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(user.role)) {
      throw new ForbiddenException('Seu papel não tem permissão para esta ação');
    }
    return true;
  }
}
