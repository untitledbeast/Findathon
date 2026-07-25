import {
  Slug,
  Url,
  Email,
  PrizePool,
  Location,
  DateRange,
  RegistrationWindow,
  TeamSize,
  HackathonStatusState
} from '../value-objects';
import { HACKATHON_STATUS } from '@/constants/status';

export interface HackathonEntityProps {
  id: string;
  title: string;
  slug: Slug;
  tagline: string | null;
  description: string;
  dateRange: DateRange;
  registrationWindow: RegistrationWindow;
  location: Location;
  tags: string[];
  registerUrl: Url;
  organizer: string;
  organization: string | null;
  coverImageUrl: Url | null;
  status: HackathonStatusState;
  teamSize: TeamSize;
  eligibility: string | null;
  prizePool: PrizePool;
  contactName: string | null;
  contactEmail: Email | null;
  contactPhone: string | null;
  socialTwitter: string | null;
  socialLinkedin: string | null;
  socialDiscord: string | null;
  socialInstagram: string | null;
  submittedBy: string | null;
  viewCount: number;
  saveCount: number;
  avgRating: number;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'open';
  hasCertificate: boolean;
  isHiring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class HackathonEntity {
  private props: HackathonEntityProps;

  constructor(props: HackathonEntityProps) {
    this.props = { ...props };
  }

  public get id(): string { return this.props.id; }
  public get title(): string { return this.props.title; }
  public get slug(): Slug { return this.props.slug; }
  public get tagline(): string | null { return this.props.tagline; }
  public get description(): string { return this.props.description; }
  public get dateRange(): DateRange { return this.props.dateRange; }
  public get registrationWindow(): RegistrationWindow { return this.props.registrationWindow; }
  public get location(): Location { return this.props.location; }
  public get tags(): string[] { return [...this.props.tags]; }
  public get registerUrl(): Url { return this.props.registerUrl; }
  public get organizer(): string { return this.props.organizer; }
  public get organization(): string | null { return this.props.organization; }
  public get coverImageUrl(): Url | null { return this.props.coverImageUrl; }
  public get status(): HackathonStatusState { return this.props.status; }
  public get teamSize(): TeamSize { return this.props.teamSize; }
  public get eligibility(): string | null { return this.props.eligibility; }
  public get prizePool(): PrizePool { return this.props.prizePool; }
  public get contactName(): string | null { return this.props.contactName; }
  public get contactEmail(): Email | null { return this.props.contactEmail; }
  public get contactPhone(): string | null { return this.props.contactPhone; }
  public get socialTwitter(): string | null { return this.props.socialTwitter; }
  public get socialLinkedin(): string | null { return this.props.socialLinkedin; }
  public get socialDiscord(): string | null { return this.props.socialDiscord; }
  public get socialInstagram(): string | null { return this.props.socialInstagram; }
  public get submittedBy(): string | null { return this.props.submittedBy; }
  public get viewCount(): number { return this.props.viewCount; }
  public get saveCount(): number { return this.props.saveCount; }
  public get avgRating(): number { return this.props.avgRating; }
  public get reviewCount(): number { return this.props.reviewCount; }
  public get isVerified(): boolean { return this.props.isVerified; }
  public get isFeatured(): boolean { return this.props.isFeatured; }
  public get difficulty(): 'beginner' | 'intermediate' | 'advanced' | 'open' { return this.props.difficulty; }
  public get hasCertificate(): boolean { return this.props.hasCertificate; }
  public get isHiring(): boolean { return this.props.isHiring; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  // State Transitions (Aggregate Control)
  public approve(): void {
    this.props.status = this.props.status.transitionTo(HACKATHON_STATUS.APPROVED);
    this.props.isVerified = true;
    this.props.updatedAt = new Date();
  }

  public reject(): void {
    this.props.status = this.props.status.transitionTo(HACKATHON_STATUS.REJECTED);
    this.props.updatedAt = new Date();
  }

  public archive(): void {
    this.props.status = this.props.status.transitionTo(HACKATHON_STATUS.ARCHIVED);
    this.props.updatedAt = new Date();
  }

  public incrementViews(): void {
    this.props.viewCount += 1;
  }

  public incrementSaves(): void {
    this.props.saveCount += 1;
  }

  public decrementSaves(): void {
    this.props.saveCount = Math.max(0, this.props.saveCount - 1);
  }

  public isRegistrationOpen(): boolean {
    if (!this.props.status.isApproved()) return false;
    return !this.props.registrationWindow.isClosed();
  }

  public calculateQualityScore(): number {
    let score = 50;
    if (this.props.description.length > 300) score += 15;
    if (this.props.isVerified) score += 20;
    if (this.props.prizePool.getNumericAmount() > 5000) score += 15;
    return Math.min(100, score);
  }

  public toProps(): HackathonEntityProps {
    return { ...this.props };
  }
}
