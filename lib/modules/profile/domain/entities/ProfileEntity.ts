import { Entity, UniqueId } from '@/lib/shared';

export interface ProfileProps {
  fullName: string;
  avatarUrl: string | null;
  bio?: string;
  organization?: string;
  phone?: string;
  website?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialInstagram?: string;
  socialDiscord?: string;
  skills?: string[];
  interests?: string[];
  role: 'user' | 'organizer' | 'admin';
  isFirstLogin?: boolean;
  onboardingComplete?: boolean;
  xpPoints?: number;
}

export class ProfileEntity extends Entity<ProfileProps> {
  get fullName(): string { return this.props.fullName; }
  get avatarUrl(): string | null { return this.props.avatarUrl; }
  get bio(): string { return this.props.bio || ''; }
  get organization(): string { return this.props.organization || ''; }
  get phone(): string { return this.props.phone || ''; }
  get website(): string { return this.props.website || ''; }
  get socialTwitter(): string { return this.props.socialTwitter || ''; }
  get socialLinkedin(): string { return this.props.socialLinkedin || ''; }
  get socialInstagram(): string { return this.props.socialInstagram || ''; }
  get socialDiscord(): string { return this.props.socialDiscord || ''; }
  get skills(): string[] { return this.props.skills || []; }
  get interests(): string[] { return this.props.interests || []; }
  get role(): 'user' | 'organizer' | 'admin' { return this.props.role; }
  get isFirstLogin(): boolean { return this.props.isFirstLogin ?? false; }
  get onboardingComplete(): boolean { return this.props.onboardingComplete ?? true; }
  get xpPoints(): number { return this.props.xpPoints || 0; }

  public updateDetails(fields: Partial<Omit<ProfileProps, 'role'>>): ProfileEntity {
    return new ProfileEntity(
      {
        ...this.props,
        ...fields,
      },
      this._id
    );
  }

  public completeOnboarding(interests: string[], skills: string[]): ProfileEntity {
    return new ProfileEntity(
      {
        ...this.props,
        interests,
        skills,
        isFirstLogin: false,
        onboardingComplete: true
      },
      this._id
    );
  }

  public static create(props: ProfileProps, id?: string): ProfileEntity {
    return new ProfileEntity(props, id ? new UniqueId(id) : undefined);
  }
}
