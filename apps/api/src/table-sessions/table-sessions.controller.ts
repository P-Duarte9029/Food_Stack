import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  openTableSessionInputSchema,
  type OpenTableSessionInput,
  type TableSession,
} from '@food-stack/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TableSessionsService } from './table-sessions.service';

@Controller('table-sessions')
export class TableSessionsController {
  constructor(private readonly sessions: TableSessionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<TableSession[]> {
    return this.sessions.listOpen(user.restaurantId);
  }

  @Post()
  @Roles('waiter', 'manager')
  open(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(openTableSessionInputSchema)) body: OpenTableSessionInput,
  ): Promise<TableSession> {
    return this.sessions.open(user.restaurantId, body);
  }

  @Post(':id/close')
  @Roles('waiter', 'manager')
  @HttpCode(204)
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sessions.close(user.restaurantId, id);
  }
}
