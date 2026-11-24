import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { OriginGuard } from './auth/origin.guard';
import { AuthModule } from './auth/session.service';
import { BootstrapService } from './bootstrap.service';
import { HealthController } from './health.controller';
import { MenuController } from './menu/menu.controller';
import { MenuService } from './menu/menu.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { PrismaModule } from './prisma.service';
import { RealtimeModule } from './realtime/realtime.gateway';
import { RestaurantController } from './restaurant/restaurant.controller';
import { RestaurantService } from './restaurant/restaurant.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

@Module({
  imports: [PrismaModule, AuthModule, RealtimeModule],
  controllers: [
    HealthController,
    AuthController,
    MenuController,
    OrdersController,
    RestaurantController,
    UsersController,
  ],
  providers: [
    BootstrapService,
    MenuService,
    OrdersService,
    RestaurantService,
    UsersService,
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
