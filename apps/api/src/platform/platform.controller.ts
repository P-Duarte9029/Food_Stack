import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  createRestaurantInputSchema,
  updateRestaurantInputSchema,
  type CreateRestaurantInput,
  type PlatformRestaurant,
  type UpdateRestaurantInput,
} from '@food-stack/shared';
import { Roles } from '../auth/auth.decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlatformService } from './platform.service';

@Controller('platform/restaurants')
@Roles('super_admin')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  list(): Promise<PlatformRestaurant[]> {
    return this.platform.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createRestaurantInputSchema)) body: CreateRestaurantInput,
  ): Promise<PlatformRestaurant> {
    return this.platform.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateRestaurantInputSchema)) body: UpdateRestaurantInput,
  ): Promise<PlatformRestaurant> {
    return this.platform.update(id, body);
  }
}
