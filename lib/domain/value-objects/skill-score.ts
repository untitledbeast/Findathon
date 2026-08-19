import { ValidationError } from '@/lib/errors';

export class SkillScore {
  private readonly value: number;

  constructor(score: number) {
    if (typeof score !== 'number' || isNaN(score)) {
      throw new ValidationError('Skill score must be a valid number');
    }
    // Clamp to [0, 1] and round to 4 decimals for precision
    const clamped = Math.max(0, Math.min(1, score));
    this.value = Math.round(clamped * 10000) / 10000;
  }

  public getValue(): number {
    return this.value;
  }

  public getPercentage(): number {
    return Math.round(this.value * 100);
  }

  public equals(other?: SkillScore | null): boolean {
    return !!other && other.getValue() === this.value;
  }

  public toString(): string {
    return `${this.getPercentage()}%`;
  }

  public toJSON(): number {
    return this.value;
  }
}
