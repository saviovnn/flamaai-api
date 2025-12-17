import {
  PipeTransform,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => {
          const campo = err.path.join('.') || 'body';
          return {
            campo,
            erro: err.message,
          };
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Erro de validação',
            errors: errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new BadRequestException('Erro de validação');
    }
  }
}
