import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type CreateRestaurantInput,
  type PlatformRestaurant,
  type UpdateRestaurantInput,
} from '@food-stack/shared';
import { hashPassword } from '../auth/password';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PLATFORM_RESTAURANT_ID } from '../restaurant/default-restaurant';

const restaurantSelect = {
  id: true,
  name: true,
  tablesCount: true,
  active: true,
  createdAt: true,
} as const;

interface RestaurantRecord {
  id: string;
  name: string;
  tablesCount: number;
  active: boolean;
  createdAt: Date;
}

export const toPlatformRestaurant = (record: RestaurantRecord): PlatformRestaurant => ({
  id: record.id,
  name: record.name,
  tablesCount: record.tablesCount,
  active: record.active,
  createdAt: record.createdAt.toISOString(),
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Todos os restaurantes, exceto o interno que ancora o super admin. */
  async list(): Promise<PlatformRestaurant[]> {
    const records = await this.prisma.restaurant.findMany({
      where: { id: { not: PLATFORM_RESTAURANT_ID } },
      orderBy: { createdAt: 'asc' },
      select: restaurantSelect,
    });
    return records.map(toPlatformRestaurant);
  }

  /** Cria o restaurante, vazio, junto com o primeiro gerente, numa única operação. */
  async create(input: CreateRestaurantInput): Promise<PlatformRestaurant> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.manager.email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Já existe um usuário com este e-mail');

    const passwordHash = await hashPassword(input.manager.password);
    try {
      const record = await this.prisma.restaurant.create({
        data: {
          name: input.name,
          tablesCount: input.tablesCount,
          users: {
            create: {
              name: input.manager.name,
              email: input.manager.email,
              role: 'manager',
              passwordHash,
            },
          },
        },
        select: restaurantSelect,
      });
      return toPlatformRestaurant(record);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Já existe um usuário com este e-mail');
      throw error;
    }
  }

  async update(id: string, input: UpdateRestaurantInput): Promise<PlatformRestaurant> {
    const current = await this.prisma.restaurant.findFirst({
      where: { id, NOT: { id: PLATFORM_RESTAURANT_ID } },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('Restaurante não encontrado');

    const record = await this.prisma.restaurant.update({
      where: { id },
      data: { name: input.name, tablesCount: input.tablesCount, active: input.active },
      select: restaurantSelect,
    });

    if (input.tablesCount !== undefined) {
      this.realtime.publish(id, REALTIME_EVENTS.settingsChanged, {
        tablesCount: record.tablesCount,
      });
    }
    if (input.active === false) await this.kickEveryone(id);
    return toPlatformRestaurant(record);
  }

  /** Encerra as sessões e derruba os sockets de um restaurante desativado. */
  private async kickEveryone(restaurantId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { user: { restaurantId } } });
    this.realtime.disconnectRestaurant(restaurantId);
  }
}
