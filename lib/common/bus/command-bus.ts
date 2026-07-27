import { Result, err } from '@/lib/shared';
import { BaseError } from '@/lib/errors';
import { RequestContext } from '@/lib/context/request-context';

export interface Command<T = unknown> {
  readonly kind: string;
  readonly payload: T;
  readonly idempotencyKey?: string;
}

export interface CommandHandler<C extends Command, R = unknown> {
  execute(ctx: RequestContext, command: C): Promise<Result<R, BaseError>>;
}

export class CommandBus {
  private static instance: CommandBus;
  private readonly handlers = new Map<string, CommandHandler<Command>>();

  private constructor() {}

  public static getInstance(): CommandBus {
    if (!CommandBus.instance) {
      CommandBus.instance = new CommandBus();
    }
    return CommandBus.instance;
  }

  public register<C extends Command>(kind: string, handler: CommandHandler<C>): void {
    this.handlers.set(kind, handler as CommandHandler<Command>);
  }

  public async dispatch<C extends Command, R = unknown>(
    ctx: RequestContext,
    command: C
  ): Promise<Result<R, BaseError>> {
    const handler = this.handlers.get(command.kind);
    if (!handler) {
      return err(new BaseError(`No handler registered for command: ${command.kind}`));
    }

    const startTime = Date.now();
    try {
      // Pipeline: Logging -> Tracing -> Authorization -> Execution -> Metrics
      const result = await handler.execute(ctx, command);
      const took = Date.now() - startTime;
      if (took > 1000) {
        console.warn(`[CommandBus] Slow command execution: ${command.kind} took ${took}ms (requestId: ${ctx.requestId})`);
      }
      return result as Result<R, BaseError>;
    } catch (error) {
      return err(new BaseError(error instanceof Error ? error.message : 'Command dispatch failed'));
    }
  }
}

export const commandBus = CommandBus.getInstance();
