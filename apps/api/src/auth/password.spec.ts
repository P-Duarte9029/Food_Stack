import { describe, expect, it } from 'vitest';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('valida a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword('senha-bem-longa-123');
    expect(await verifyPassword('senha-bem-longa-123', hash)).toBe(true);
    expect(await verifyPassword('outra-senha-456', hash)).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt)', async () => {
    expect(await hashPassword('mesma-senha-123')).not.toBe(await hashPassword('mesma-senha-123'));
  });

  it('rejeita formatos inválidos sem lançar erro', async () => {
    expect(await verifyPassword('x', 'texto-solto')).toBe(false);
    expect(await verifyPassword('x', DUMMY_HASH)).toBe(false);
  });
});
