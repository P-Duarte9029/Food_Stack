import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@food-stack/shared';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('responde com o contrato compartilhado', () => {
    const result = new HealthController().check();
    expect(healthResponseSchema.parse(result)).toEqual({ status: 'ok' });
  });
});
