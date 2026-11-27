import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  createUserInputSchema,
  platformUpdateUserInputSchema,
  type CreateUserInput,
  type PlatformUpdateUserInput,
  type UserSummary,
} from '@food-stack/shared';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from '../users/users.service';
import { PlatformService } from './platform.service';

/**
 * Equipe de qualquer restaurante, só para o super admin. O restaurante vem da rota (e é
 * validado), nunca da sessão: o super admin não pertence a nenhum restaurante da lista.
 */
@Controller('platform/restaurants/:restaurantId/users')
@Roles('super_admin')
export class PlatformUsersController {
  constructor(
    private readonly platform: PlatformService,
    private readonly users: UsersService,
  ) {}

  @Get()
  async list(@Param('restaurantId', ParseUUIDPipe) restaurantId: string): Promise<UserSummary[]> {
    await this.platform.assertManageable(restaurantId);
    return this.users.list(restaurantId);
  }

  @Post()
  async create(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body(new ZodValidationPipe(createUserInputSchema)) body: CreateUserInput,
  ): Promise<UserSummary> {
    await this.platform.assertManageable(restaurantId);
    return this.users.create(restaurantId, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(platformUpdateUserInputSchema)) body: PlatformUpdateUserInput,
  ): Promise<UserSummary> {
    await this.platform.assertManageable(restaurantId);
    return 'active' in body
      ? this.users.setActive(restaurantId, actor.id, id, body.active)
      : this.users.updateProfile(restaurantId, id, body);
  }
}
