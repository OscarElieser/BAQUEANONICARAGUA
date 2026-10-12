import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';

/** Valida y normaliza entradas con zod; responde 400 con mensajes legibles. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  // Entrada y salida pueden diferir (valores por defecto, coerción)
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join('.') || 'entrada'}: ${i.message}`).join('; ');
      throw new BadRequestException(detail);
    }
    return parsed.data;
  }
}

/** Traduce errores de Postgres/PostgREST a HTTP sin filtrar detalles internos. */
export function httpFromDb(error: { code?: string; message?: string }): never {
  const msg = error.message ?? 'Error';
  switch (error.code) {
    case '42501':
      throw new ForbiddenException(msg);
    case '22023':
      throw new BadRequestException(msg);
    case 'P0002':
      throw new NotFoundException(msg);
    case '55000':
    case '54000':
      throw new ConflictException(msg);
    default:
      // Mensajes de nuestras funciones son seguros; los demás no se exponen.
      throw new InternalServerErrorException('Error de base de datos. Intenta de nuevo.');
  }
}
