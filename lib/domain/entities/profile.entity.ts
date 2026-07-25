import { Url, Role } from '../value-objects';

export interface ProfileEntityProps {
  id: string;
  fullName: string | null;
  avatarUrl: Url | null;
  bio: string | null;
  organization: string | null;
  phone: string | null;
  website: Url | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialInstagram: string | null;
  socialDiscord: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export class ProfileEntity {
  constructor(private props: ProfileEntityProps) {}

  public get id(): string { return this.props.id; }
  public get fullName(): string | null { return this.props.fullName; }
  public get avatarUrl(): Url | null { return this.props.avatarUrl; }
  public get bio(): string | null { return this.props.bio; }
  public get organization(): string | null { return this.props.organization; }
  public get phone(): string | null { return this.props.phone; }
  public get website(): Url | null { return this.props.website; }
  public get socialTwitter(): string | null { return this.props.socialTwitter; }
  public get socialLinkedin(): string | null { return this.props.socialLinkedin; }
  public get socialInstagram(): string | null { return this.props.socialInstagram; }
  public get socialDiscord(): string | null { return this.props.socialDiscord; }
  public get role(): Role { return this.props.role; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  public calculateCompleteness(): number {
    const fields = [
      this.props.fullName,
      this.props.bio,
      this.props.organization,
      this.props.phone,
      this.props.website?.getValue(),
      this.props.socialTwitter,
      this.props.socialLinkedin,
      this.props.socialInstagram,
      this.props.socialDiscord
    ];
    const filled = fields.filter(f => !!f && f.trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  public toProps(): ProfileEntityProps { return { ...this.props }; }
}
