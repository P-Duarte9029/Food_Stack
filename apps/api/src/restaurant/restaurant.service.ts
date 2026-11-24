import { Injectable } from '@nestjs/common';
import { REALTIME_EVENTS, type RestaurantSettings } from '@food-stack/shared';
import { PrismaService } from '../prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class RestaurantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async getSettings(restaurantId: string): Promise<RestaurantSettings> {
    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { tablesCount: true },
    });
    return { tablesCount: restaurant.tablesCount };
  }

  async updateSettings(
    restaurantId: string,
    settings: RestaurantSettings,
  ): Promise<RestaurantSettings> {
    const restaurant = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { tablesCount: settings.tablesCount },
      select: { tablesCount: true },
    });
    const result = { tablesCount: restaurant.tablesCount };
    this.realtime.publish(restaurantId, REALTIME_EVENTS.settingsChanged, result);
    return result;
  }
}
