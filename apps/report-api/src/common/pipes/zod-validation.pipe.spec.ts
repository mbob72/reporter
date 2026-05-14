import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns parsed data for valid payload', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        reportCode: z.string().trim().min(1),
      }),
    );

    const parsed = pipe.transform({ reportCode: '  simple-sales-summary  ' });

    expect(parsed).toEqual({ reportCode: 'simple-sales-summary' });
  });

  it('throws BadRequestException for invalid payload', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        reportCode: z.string().trim().min(1),
      }),
      'Invalid report code.',
    );

    expect(() => pipe.transform({ reportCode: '   ' })).toThrow(BadRequestException);

    try {
      pipe.transform({ reportCode: '   ' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const badRequestError = error as BadRequestException;
      expect(badRequestError.getResponse()).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid report code.',
      });
    }
  });
});
