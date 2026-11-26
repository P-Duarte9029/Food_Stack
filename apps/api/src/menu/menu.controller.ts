import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  createMenuItemInputSchema,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<MenuItem[]> {
    return this.menu.list(user.restaurantId);
  }

  @Post()
  @Roles('manager')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createMenuItemInputSchema)) body: CreateMenuItemInput,
  ): Promise<MenuItem> {
    return this.menu.create(user.restaurantId, body);
  }

  @Put(':id')
  @Roles('manager')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createMenuItemInputSchema)) body: CreateMenuItemInput,
  ): Promise<MenuItem> {
    return this.menu.update(user.restaurantId, id, body);
  }

  @Delete(':id')
  @Roles('manager')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.menu.remove(user.restaurantId, id);
  }
}
