import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const hostOf = (origin: string): string | null => {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
};

/**
 * Defesa extra contra CSRF além do SameSite: em requisições que alteram estado,
 * o Origin (quando enviado pelo navegador) deve ser o mesmo host da API ou um
 * dos origens permitidos em WEB_ORIGIN.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedHosts = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => hostOf(origin.trim()))
    .filter((host): host is string => host !== null);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.headers.origin;
    if (!origin) return true;

    const originHost = hostOf(origin);
    if (originHost && (originHost === request.headers.host || this.allowedHosts.includes(originHost))) {
      return true;
    }
    throw new ForbiddenException('Origem não permitida');
  }
}
