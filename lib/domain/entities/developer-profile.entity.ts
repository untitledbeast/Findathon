export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface DeveloperProfileEntityProps {
  id: string;
  userId: string;
  topLanguages: Record<string, number>;
  topSkills: Record<string, number>;
  interests: string[];
  experienceLevel: ExperienceLevel | null;
  githubConnected: boolean;
  leetcodeConnected: boolean;
  linkedinConnected: boolean;
  lastComputedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export class DeveloperProfileEntity {
  constructor(private props: DeveloperProfileEntityProps) {}

  public get id(): string { return this.props.id; }
  public get userId(): string { return this.props.userId; }
  public get topLanguages(): Record<string, number> { return { ...this.props.topLanguages }; }
  public get topSkills(): Record<string, number> { return { ...this.props.topSkills }; }
  public get interests(): string[] { return [...this.props.interests]; }
  public get experienceLevel(): ExperienceLevel | null { return this.props.experienceLevel; }
  public get githubConnected(): boolean { return this.props.githubConnected; }
  public get leetcodeConnected(): boolean { return this.props.leetcodeConnected; }
  public get linkedinConnected(): boolean { return this.props.linkedinConnected; }
  public get lastComputedAt(): number | null { return this.props.lastComputedAt; }
  public get createdAt(): number { return this.props.createdAt; }
  public get updatedAt(): number { return this.props.updatedAt; }

  public toProps(): DeveloperProfileEntityProps {
    return {
      ...this.props,
      topLanguages: { ...this.props.topLanguages },
      topSkills: { ...this.props.topSkills },
      interests: [...this.props.interests]
    };
  }

  public toJSON() {
    return this.toProps();
  }
}
