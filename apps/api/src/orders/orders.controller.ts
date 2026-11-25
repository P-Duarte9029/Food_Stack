import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { createOrderInputSchema, type CreateOrderInput, type Order } from '@food-stack/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Order[]> {
    return this.orders.list(user.restaurantId);
  }

  @Post()
  @Roles('waiter', 'manager')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createOrderInputSchema)) body: CreateOrderInput,
  ): Promise<Order> {
    return this.orders.create(user.restaurantId, user.id, body);
  }

  @Patch(':id/advance')
  @Roles('cook', 'manager')
  advance(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.orders.advance(user.restaurantId, id);
  }
}
