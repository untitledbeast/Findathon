import { ERROR_CODES, ErrorCode } from '@/constants/error-codes';

export class BaseError extends Error {
  constructor(
    public override message: string,
    public code: ErrorCode | string = ERROR_CODES.INTERNAL_ERROR,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintain proper prototype chain for instanceof checks across transpilation targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
