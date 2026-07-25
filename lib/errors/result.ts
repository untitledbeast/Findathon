import { BaseError } from './index';

export type Result<T, E = BaseError> =
  | { ok: true; value: T; error?: undefined }
  | { ok: false; error: E; value?: undefined };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = BaseError>(error: E): Result<never, E> {
  return { ok: false, error };
}
