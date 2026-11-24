import { Body, Controller, Get, Put } from '@nestjs/common';
import { restaurantSettingsSchema, type RestaurantSettings } from '@food-stack/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RestaurantService } from './restaurant.service';

@Controller('restaurant/settings')
export class RestaurantController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<RestaurantSettings> {
    return this.restaurant.getSettings(user.restaurantId);
  }

  @Put()
  @Roles('manager')
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(restaurantSettingsSchema)) body: RestaurantSettings,
  ): Promise<RestaurantSettings> {
    return this.restaurant.updateSettings(user.restaurantId, body);
  }
}
