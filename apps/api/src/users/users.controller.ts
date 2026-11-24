import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  createUserInputSchema,
  updateUserInputSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserSummary,
} from '@food-stack/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
@Roles('manager')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<UserSummary[]> {
    return this.users.list(user.restaurantId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createUserInputSchema)) body: CreateUserInput,
  ): Promise<UserSummary> {
    return this.users.create(user.restaurantId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserInputSchema)) body: UpdateUserInput,
  ): Promise<UserSummary> {
    return this.users.setActive(user.restaurantId, user.id, id, body.active);
  }
}
