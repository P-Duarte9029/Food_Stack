import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { LoginRateLimiter } from './login-rate-limiter';

describe('LoginRateLimiter', () => {
  it('bloqueia após 5 falhas e libera depois da janela', () => {
    let now = 0;
    const limiter = new LoginRateLimiter();
    limiter.clock = () => now;
    for (let i = 0; i < 5; i += 1) {
      limiter.assertAllowed('k');
      limiter.registerFailure('k');
    }
    expect(() => limiter.assertAllowed('k')).toThrow(HttpException);

    now = 16 * 60 * 1000;
    expect(() => limiter.assertAllowed('k')).not.toThrow();
  });

  it('reset após login bem-sucedido e isolamento entre chaves', () => {
    const limiter = new LoginRateLimiter();
    for (let i = 0; i < 5; i += 1) limiter.registerFailure('a');
    expect(() => limiter.assertAllowed('b')).not.toThrow();
    limiter.reset('a');
    expect(() => limiter.assertAllowed('a')).not.toThrow();
  });
});
