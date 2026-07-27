import { Result, err } from '@/lib/shared';
import { BaseError } from '@/lib/errors';
import { RequestContext } from '@/lib/context/request-context';

export interface Query<T = unknown> {
  readonly kind: string;
  readonly params: T;
}

export interface QueryHandler<Q extends Query, R = unknown> {
  execute(ctx: RequestContext, query: Q): Promise<Result<R, BaseError>>;
}

export class QueryBus {
  private static instance: QueryBus;
  private readonly handlers = new Map<string, QueryHandler<Query>>();

  private constructor() {}

  public static getInstance(): QueryBus {
    if (!QueryBus.instance) {
      QueryBus.instance = new QueryBus();
    }
    return QueryBus.instance;
  }

  public register<Q extends Query>(kind: string, handler: QueryHandler<Q>): void {
    this.handlers.set(kind, handler as QueryHandler<Query>);
  }

  public async execute<Q extends Query, R = unknown>(
    ctx: RequestContext,
    query: Q
  ): Promise<Result<R, BaseError>> {
    const handler = this.handlers.get(query.kind);
    if (!handler) {
      return err(new BaseError(`No handler registered for query: ${query.kind}`));
    }

    try {
      const result = await handler.execute(ctx, query);
      return result as Result<R, BaseError>;
    } catch (error) {
      return err(new BaseError(error instanceof Error ? error.message : 'Query execution failed'));
    }
  }
}

export const queryBus = QueryBus.getInstance();
