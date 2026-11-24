import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { createOrderInputSchema, type CreateOrderInput, type Order } from '@food-stack/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(): Promise<Order[]> {
    return this.orders.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createOrderInputSchema)) body: CreateOrderInput,
  ): Promise<Order> {
    return this.orders.create(body);
  }

  @Patch(':id/advance')
  advance(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orders.advance(id);
  }
}
