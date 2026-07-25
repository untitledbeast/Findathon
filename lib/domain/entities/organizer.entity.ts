import { Url } from '../value-objects';

export interface OrganizerEntityProps {
  id: string;
  name: string;
  organizationType: string;
  website: Url | null;
  logoUrl: Url | null;
  reputationScore: number;
  verifiedEventsCount: number;
  isVerified: boolean;
}

export class OrganizerEntity {
  constructor(private props: OrganizerEntityProps) {}

  public get id(): string { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get organizationType(): string { return this.props.organizationType; }
  public get website(): Url | null { return this.props.website; }
  public get logoUrl(): Url | null { return this.props.logoUrl; }
  public get reputationScore(): number { return this.props.reputationScore; }
  public get verifiedEventsCount(): number { return this.props.verifiedEventsCount; }
  public get isVerified(): boolean { return this.props.isVerified; }

  public toProps(): OrganizerEntityProps { return { ...this.props }; }
}
