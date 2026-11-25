import { createHash, randomBytes } from 'node:crypto';
import { Global, Injectable, Module } from '@nestjs/common';
import type { Role } from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { LoginRateLimiter } from './login-rate-limiter';
import { SESSION_TTL_MS } from './cookies';

export interface AuthUser {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  role: Role;
}

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    await this.prisma.session.create({
      data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
    return token;
  }

  async validate(token: string | undefined): Promise<AuthUser | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { id: hashToken(token) },
      include: { user: { include: { restaurant: { select: { active: true } } } } },
    });
    if (
      !session ||
      session.expiresAt < new Date() ||
      !session.user.active ||
      !session.user.restaurant.active
    ) {
      return null;
    }
    const { user } = session;
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async destroy(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.session.deleteMany({ where: { id: hashToken(token) } });
  }

  async destroyAllOf(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}

@Global()
@Module({
  providers: [SessionService, LoginRateLimiter],
  exports: [SessionService, LoginRateLimiter],
})
export class AuthModule {}
