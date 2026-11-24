import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MenuController } from './menu/menu.controller';
import { MenuService } from './menu/menu.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { PrismaService } from './prisma.service';
import { RealtimeModule } from './realtime/realtime.gateway';
import { RestaurantController } from './restaurant/restaurant.controller';
import { RestaurantService } from './restaurant/restaurant.service';

@Module({
  imports: [RealtimeModule],
  controllers: [HealthController, MenuController, OrdersController, RestaurantController],
  providers: [PrismaService, MenuService, OrdersService, RestaurantService],
})
export class AppModule {}
