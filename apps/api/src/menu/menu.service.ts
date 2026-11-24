import { Injectable, NotFoundException } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DEFAULT_RESTAURANT_ID } from '../restaurant/default-restaurant';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  list(): Promise<MenuItem[]> {
    return this.prisma.menuItem.findMany({
      where: { restaurantId: DEFAULT_RESTAURANT_ID },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, category: true },
    });
  }

  async create(input: CreateMenuItemInput): Promise<MenuItem> {
    const item = await this.prisma.menuItem.create({
      data: { ...input, restaurantId: DEFAULT_RESTAURANT_ID },
      select: { id: true, name: true, category: true },
    });
    await this.publishChange();
    return item;
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.menuItem.deleteMany({
      where: { id, restaurantId: DEFAULT_RESTAURANT_ID },
    });
    if (count === 0) throw new NotFoundException('Prato não encontrado');
    await this.publishChange();
  }

  private async publishChange(): Promise<void> {
    this.realtime.publish(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.menuChanged, await this.list());
  }
}
