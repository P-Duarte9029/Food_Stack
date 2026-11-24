import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('aplica os defaults de PORT e WEB_ORIGIN', () => {
    const env = parseEnv({ DATABASE_URL: 'postgresql://x' });
    expect(env.PORT).toBe(3000);
    expect(env.WEB_ORIGIN).toBe('http://localhost:5173');
  });

  it('falha sem DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow();
  });
});
