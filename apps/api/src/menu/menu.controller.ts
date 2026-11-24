import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  createMenuItemInputSchema,
  type CreateMenuItemInput,
  type MenuItem,
} from '@food-stack/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  list(): Promise<MenuItem[]> {
    return this.menu.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createMenuItemInputSchema)) body: CreateMenuItemInput,
  ): Promise<MenuItem> {
    return this.menu.create(body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.menu.remove(id);
  }
}
