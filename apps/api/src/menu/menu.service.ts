import { Injectable, NotFoundException } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  list(restaurantId: string): Promise<MenuItem[]> {
    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, category: true },
    });
  }

  async create(restaurantId: string, input: CreateMenuItemInput): Promise<MenuItem> {
    const item = await this.prisma.menuItem.create({
      data: { ...input, restaurantId },
      select: { id: true, name: true, category: true },
    });
    await this.publishChange(restaurantId);
    return item;
  }

  async remove(restaurantId: string, id: string): Promise<void> {
    const { count } = await this.prisma.menuItem.deleteMany({
      where: { id, restaurantId },
    });
    if (count === 0) throw new NotFoundException('Prato não encontrado');
    await this.publishChange(restaurantId);
  }

  private async publishChange(restaurantId: string): Promise<void> {
    this.realtime.publish(restaurantId, REALTIME_EVENTS.menuChanged, await this.list(restaurantId));
  }
}
