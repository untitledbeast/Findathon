export interface OrganizerEntityProps {
  id: string;
  name: string;
  slug: string;
  isVerified: boolean;
  followerCount: number;
}

export class OrganizerEntityDomain {
  constructor(public props: OrganizerEntityProps) {}

  public get id(): string { return this.props.id; }
  public get name(): string { return this.props.name; }
  public get slug(): string { return this.props.slug; }

  public verify(): void {
    this.props.isVerified = true;
  }

  public incrementFollowers(): void {
    this.props.followerCount += 1;
  }

  public decrementFollowers(): void {
    this.props.followerCount = Math.max(0, this.props.followerCount - 1);
  }
}
