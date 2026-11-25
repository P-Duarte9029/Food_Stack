import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { loginInputSchema, type LoginInput, type SessionUser } from '@food-stack/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CurrentUser, Public, type AuthenticatedRequest } from './auth.decorators';
import { readCookie, SESSION_COOKIE, SESSION_TTL_MS } from './cookies';
import { LoginRateLimiter } from './login-rate-limiter';
import { DUMMY_HASH, verifyPassword } from './password';
import { SessionService, type AuthUser } from './session.service';

const toSessionUser = ({ id, name, email, role }: AuthUser): SessionUser => ({
  id,
  name,
  email,
  role,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly limiter: LoginRateLimiter,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginInputSchema)) body: LoginInput,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUser> {
    const key = `${request.ip ?? 'desconhecido'}|${body.email}`;
    this.limiter.assertAllowed(key);

    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { restaurant: { select: { active: true } } },
    });
    const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.active || !valid) {
      this.limiter.registerFailure(key);
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // Só depois de provar a senha: quem não é dono da conta não descobre se o restaurante existe.
    if (!user.restaurant.active) {
      throw new ForbiddenException('Este restaurante está desativado. Fale com o suporte.');
    }

    this.limiter.reset(key);
    const token = await this.sessions.create(user.id);
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_MS,
    });
    return toSessionUser(user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): SessionUser {
    return toSessionUser(user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    await this.sessions.destroy(token);
    response.clearCookie(SESSION_COOKIE, { path: '/' });
    this.realtime.disconnectSession(token);
  }
}
