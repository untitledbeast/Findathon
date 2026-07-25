import { ZodSchema } from 'zod';
import { ValidationError } from '../errors';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new ValidationError(`Validation failed: ${errorDetails}`);
  }
  return parsed.data;
}
