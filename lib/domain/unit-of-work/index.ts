export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export class SupabaseUnitOfWork implements IUnitOfWork {
  public async begin(): Promise<void> {
    // Transaction boundary tracking
  }

  public async commit(): Promise<void> {
    // Commit boundary tracking
  }

  public async rollback(): Promise<void> {
    // Rollback boundary tracking
  }
}
