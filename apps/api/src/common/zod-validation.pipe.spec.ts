import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ n: z.number().int() }));

  it('devolve o dado validado', () => {
    expect(pipe.transform({ n: 3 })).toEqual({ n: 3 });
  });

  it('lança BadRequestException para dado inválido', () => {
    expect(() => pipe.transform({ n: 'x' })).toThrow(BadRequestException);
  });
});
