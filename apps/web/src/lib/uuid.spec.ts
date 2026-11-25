import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { generateUuid } from './uuid';

describe('generateUuid', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gera UUID v4 válido sem crypto.randomUUID (contexto inseguro)', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    const id = generateUuid();

    expect(z.string().uuid().safeParse(id).success).toBe(true);
    expect(id[14]).toBe('4');
  });

  it('não repete valores entre chamadas', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });

    expect(generateUuid()).not.toBe(generateUuid());
  });
});
