import { ILogger } from '../observability/logger.interface';

export class ConsoleLogger implements ILogger {
  public info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', message, ...meta }));
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', message, ...meta }));
  }

  public error(message: string, meta?: Record<string, unknown>, error?: unknown): void {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      ...meta
    }));
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ timestamp: new Date().toISOString(), level: 'DEBUG', message, ...meta }));
    }
  }
}

export const logger = new ConsoleLogger();
