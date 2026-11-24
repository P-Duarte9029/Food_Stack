import { Body, Controller, Get, Put } from '@nestjs/common';
import { restaurantSettingsSchema, type RestaurantSettings } from '@food-stack/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RestaurantService } from './restaurant.service';

@Controller('restaurant/settings')
export class RestaurantController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get()
  get(): Promise<RestaurantSettings> {
    return this.restaurant.getSettings();
  }

  @Put()
  update(
    @Body(new ZodValidationPipe(restaurantSettingsSchema)) body: RestaurantSettings,
  ): Promise<RestaurantSettings> {
    return this.restaurant.updateSettings(body);
  }
}
