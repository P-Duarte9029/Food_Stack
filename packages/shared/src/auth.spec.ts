import { describe, expect, it } from 'vitest';
import { createUserInputSchema, loginInputSchema } from './auth';

describe('loginInputSchema', () => {
  it('normaliza o e-mail', () => {
    expect(loginInputSchema.parse({ email: '  Ana@Exemplo.COM ', password: 'x' }).email).toBe(
      'ana@exemplo.com',
    );
  });

  it('rejeita e-mail inválido e senha vazia', () => {
    expect(loginInputSchema.safeParse({ email: 'ana', password: 'x' }).success).toBe(false);
    expect(loginInputSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('createUserInputSchema', () => {
  const valid = { name: 'Ana', email: 'ana@exemplo.com', password: '1234567890', role: 'waiter' };

  it('aceita usuário válido', () => {
    expect(createUserInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejeita senha curta e papel desconhecido', () => {
    expect(createUserInputSchema.safeParse({ ...valid, password: '123456789' }).success).toBe(false);
    expect(createUserInputSchema.safeParse({ ...valid, role: 'cashier' }).success).toBe(false);
  });
});
