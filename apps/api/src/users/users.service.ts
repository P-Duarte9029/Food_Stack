import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateUserInput, UpdateUserProfileInput, UserSummary } from '@food-stack/shared';
import { hashPassword } from '../auth/password';
import { SessionService } from '../auth/session.service';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const summarySelect = { id: true, name: true, email: true, role: true, active: true } as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly realtime: RealtimeGateway,
  ) {}

  list(restaurantId: string): Promise<UserSummary[]> {
    return this.prisma.user.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
      select: summarySelect,
    });
  }

  async create(restaurantId: string, input: CreateUserInput): Promise<UserSummary> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail');

    return this.prisma.user.create({
      data: {
        restaurantId,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      },
      select: summarySelect,
    });
  }

  /**
   * Edita nome, e-mail, papel e/ou senha. Trocar papel ou senha encerra as sessões do usuário
   * para o novo acesso valer na hora.
   */
  async updateProfile(
    restaurantId: string,
    id: string,
    input: UpdateUserProfileInput,
  ): Promise<UserSummary> {
    const target = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: summarySelect,
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    const roleChanged = input.role !== undefined && input.role !== target.role;
    if (roleChanged && target.role === 'manager' && target.active) {
      const otherManagers = await this.prisma.user.count({
        where: { restaurantId, role: 'manager', active: true, id: { not: id } },
      });
      if (otherManagers === 0) {
        throw new BadRequestException('O restaurante precisa de ao menos um gerente ativo');
      }
    }

    if (input.email !== undefined && input.email !== target.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (taken) throw new ConflictException('Já existe um usuário com este e-mail');
    }

    let updated: UserSummary;
    try {
      updated = await this.prisma.user.update({
        where: { id },
        data: {
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: input.password ? await hashPassword(input.password) : undefined,
        },
        select: summarySelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Já existe um usuário com este e-mail');
      throw error;
    }

    if (roleChanged || input.password) {
      await this.sessions.destroyAllOf(id);
      this.realtime.disconnectUser(id);
    }
    return updated;
  }

  async setActive(
    restaurantId: string,
    actorId: string,
    id: string,
    active: boolean,
  ): Promise<UserSummary> {
    const target = await this.prisma.user.findFirst({
      where: { id, restaurantId },
      select: summarySelect,
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    if (!active) {
      if (id === actorId) throw new BadRequestException('Você não pode desativar o próprio usuário');
      if (target.role === 'manager' && target.active) {
        const activeManagers = await this.prisma.user.count({
          where: { restaurantId, role: 'manager', active: true },
        });
        if (activeManagers <= 1) {
          throw new BadRequestException('O restaurante precisa de ao menos um gerente ativo');
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { active },
      select: summarySelect,
    });
    if (!active) {
      await this.sessions.destroyAllOf(id);
      this.realtime.disconnectUser(id);
    }
    return updated;
  }
}
