import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type RestaurantSettings,
} from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import {
  DEFAULT_MENU,
  DEFAULT_RESTAURANT_ID,
  DEFAULT_RESTAURANT_NAME,
} from './default-restaurant';

@Injectable()
export class RestaurantService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.prisma.restaurant.findUnique({
      where: { id: DEFAULT_RESTAURANT_ID },
    });
    if (existing) return;
    await this.prisma.restaurant.create({
      data: {
        id: DEFAULT_RESTAURANT_ID,
        name: DEFAULT_RESTAURANT_NAME,
        menuItems: { create: DEFAULT_MENU.map((item) => ({ ...item })) },
      },
    });
  }

  async getSettings(): Promise<RestaurantSettings> {
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: DEFAULT_RESTAURANT_ID },
      select: { tablesCount: true },
    });
    return { tablesCount: restaurant.tablesCount };
  }

  async updateSettings(settings: RestaurantSettings): Promise<RestaurantSettings> {
    const restaurant = await this.prisma.restaurant.update({
      where: { id: DEFAULT_RESTAURANT_ID },
      data: { tablesCount: settings.tablesCount },
      select: { tablesCount: true },
    });
    const result = { tablesCount: restaurant.tablesCount };
    this.realtime.publish(DEFAULT_RESTAURANT_ID, REALTIME_EVENTS.settingsChanged, result);
    return result;
  }
}
