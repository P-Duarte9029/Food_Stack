import { Injectable, NotFoundException } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  canonicalCategory,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const MENU_ITEM_SELECT = { id: true, name: true, category: true, sizes: true } as const;

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
      select: MENU_ITEM_SELECT,
    });
  }

  async create(restaurantId: string, input: CreateMenuItemInput): Promise<MenuItem> {
    const category = await this.canonicalCategoryFor(restaurantId, input.category);
    const item = await this.prisma.menuItem.create({
      data: { ...input, category, restaurantId },
      select: MENU_ITEM_SELECT,
    });
    await this.publishChange(restaurantId);
    return item;
  }

  /** Substitui nome, categoria e tamanhos. Pedidos já feitos guardam o nome da época. */
  async update(restaurantId: string, id: string, input: CreateMenuItemInput): Promise<MenuItem> {
    const category = await this.canonicalCategoryFor(restaurantId, input.category);
    const { count } = await this.prisma.menuItem.updateMany({
      where: { id, restaurantId },
      data: { ...input, category },
    });
    if (count === 0) throw new NotFoundException('Prato não encontrado');
    const item = await this.prisma.menuItem.findFirstOrThrow({
      where: { id, restaurantId },
      select: MENU_ITEM_SELECT,
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

  private async canonicalCategoryFor(restaurantId: string, input: string): Promise<string> {
    const existing = await this.prisma.menuItem.findMany({
      where: { restaurantId },
      distinct: ['category'],
      orderBy: { createdAt: 'asc' },
      select: { category: true },
    });
    return canonicalCategory(
      existing.map((row) => row.category),
      input,
    );
  }

  private async publishChange(restaurantId: string): Promise<void> {
    this.realtime.publish(restaurantId, REALTIME_EVENTS.menuChanged, await this.list(restaurantId));
  }
}
