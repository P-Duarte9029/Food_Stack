import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('aceita a resposta ok', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('rejeita outros status', () => {
    expect(healthResponseSchema.safeParse({ status: 'down' }).success).toBe(false);
  });
});
