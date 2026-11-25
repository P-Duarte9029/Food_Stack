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

  describe('super admin inicial', () => {
    const base = { DATABASE_URL: 'postgresql://x' };

    it('é opcional e usa um nome padrão', () => {
      const env = parseEnv(base);
      expect(env.SEED_SUPER_ADMIN_EMAIL).toBeUndefined();
      expect(env.SEED_SUPER_ADMIN_PASSWORD).toBeUndefined();
      expect(env.SEED_SUPER_ADMIN_NAME).toBe('Super admin');
    });

    it('trata variáveis vazias como ausentes', () => {
      const env = parseEnv({ ...base, SEED_SUPER_ADMIN_EMAIL: '', SEED_SUPER_ADMIN_PASSWORD: '' });
      expect(env.SEED_SUPER_ADMIN_EMAIL).toBeUndefined();
      expect(env.SEED_SUPER_ADMIN_PASSWORD).toBeUndefined();
    });

    it('normaliza o e-mail e exige senha forte', () => {
      const env = parseEnv({
        ...base,
        SEED_SUPER_ADMIN_EMAIL: ' ROOT@Exemplo.com ',
        SEED_SUPER_ADMIN_PASSWORD: 'uma-senha-longa-1',
      });
      expect(env.SEED_SUPER_ADMIN_EMAIL).toBe('root@exemplo.com');
      expect(() => parseEnv({ ...base, SEED_SUPER_ADMIN_PASSWORD: 'curta' })).toThrow();
    });
  });
});
