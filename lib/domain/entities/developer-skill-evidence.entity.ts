export type SkillEvidenceSource = 'github' | 'leetcode' | 'findathon';
export type SkillEvidenceType = 'repo' | 'submission' | 'project' | 'activity';

export interface DeveloperSkillEvidenceEntityProps {
  id: string;
  userId: string;
  source: SkillEvidenceSource;
  evidenceType: SkillEvidenceType;
  externalId: string | null;
  url: string | null;
  signals: Record<string, unknown>;
  weight: number;
  createdAt: number;
  updatedAt: number;
}

export class DeveloperSkillEvidenceEntity {
  constructor(private props: DeveloperSkillEvidenceEntityProps) {
    if (this.props.weight < 0 || this.props.weight > 1) {
      throw new Error('Evidence weight must be clamped between 0 and 1');
    }
  }

  public get id(): string { return this.props.id; }
  public get userId(): string { return this.props.userId; }
  public get source(): SkillEvidenceSource { return this.props.source; }
  public get evidenceType(): SkillEvidenceType { return this.props.evidenceType; }
  public get externalId(): string | null { return this.props.externalId; }
  public get url(): string | null { return this.props.url; }
  public get signals(): Record<string, unknown> { return { ...this.props.signals }; }
  public get weight(): number { return this.props.weight; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }

  public toProps(): DeveloperSkillEvidenceEntityProps {
    return {
      ...this.props,
      signals: { ...this.props.signals }
    };
  }

  public toJSON() {
    return this.toProps();
  }
}
