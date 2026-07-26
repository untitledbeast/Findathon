export class UniqueId {
  private readonly value: string;

  constructor(id?: string) {
    this.value = id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  }

  public toString(): string {
    return this.value;
  }

  public equals(id?: UniqueId): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    if (!(id instanceof UniqueId)) {
      return false;
    }
    return id.toString() === this.value;
  }
}
