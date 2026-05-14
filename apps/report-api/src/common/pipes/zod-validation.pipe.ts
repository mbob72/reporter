import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe<TSchemaOutput> implements PipeTransform<unknown, TSchemaOutput> {
  constructor(
    private readonly schema: ZodType<TSchemaOutput>,
    private readonly invalidMessage = 'Invalid request payload.',
  ) {}

  transform(value: unknown): TSchemaOutput {
    const parsedValue = this.schema.safeParse(value);

    if (!parsedValue.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: this.invalidMessage,
      });
    }

    return parsedValue.data;
  }
}
