import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Entry {
  failures: number;
  firstFailureAt: number;
}

// Em memória: suficiente para uma única instância. Com várias instâncias, mover para Redis/banco.
@Injectable()
export class LoginRateLimiter {
  private readonly entries = new Map<string, Entry>();

  clock: () => number = Date.now;

  assertAllowed(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (this.clock() - entry.firstFailureAt > WINDOW_MS) {
      this.entries.delete(key);
      return;
    }
    if (entry.failures >= MAX_FAILURES) {
      throw new HttpException(
        'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  registerFailure(key: string): void {
    const entry = this.entries.get(key);
    if (!entry || this.clock() - entry.firstFailureAt > WINDOW_MS) {
      this.entries.set(key, { failures: 1, firstFailureAt: this.clock() });
      return;
    }
    entry.failures += 1;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }
}
