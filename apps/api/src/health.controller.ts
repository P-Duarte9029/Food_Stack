import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.decorators';
import type { HealthResponse } from '@food-stack/shared';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
