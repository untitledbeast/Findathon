import { ILogger } from './logger.interface';

export class ConsoleLogger implements ILogger {
  info(message: string, meta: Record<string, unknown> = {}): void {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, ...meta }));
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, ...meta }));
  }

  error(message: string, meta: Record<string, unknown> = {}, error?: unknown): void {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      ...meta,
      errorStack: error instanceof Error ? error.stack : String(error)
    }));
  }

  debug(message: string, meta: Record<string, unknown> = {}): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ level: 'DEBUG', timestamp: new Date().toISOString(), message, ...meta }));
    }
  }
}

export const logger = new ConsoleLogger();
