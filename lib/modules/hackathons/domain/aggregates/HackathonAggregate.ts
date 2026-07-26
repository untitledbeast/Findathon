import { AggregateRoot, UniqueId } from '@/lib/shared';

export interface HackathonProps {
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  locationCity?: string;
  locationCollege?: string;
  isOnline: boolean;
  latitude?: number;
  longitude?: number;
  tags: string[];
  prizePool: string;
  prizeAmount: number;
  organizer: string;
  coverImage?: string;
  logoUrl?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
  viewsCount: number;
  avgRating: number;
  reviewsCount: number;
  submittedBy?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export class HackathonAggregate extends AggregateRoot<HackathonProps> {
  get title(): string { return this.props.title; }
  get slug(): string { return this.props.slug; }
  get description(): string { return this.props.description; }
  get startDate(): string { return this.props.startDate; }
  get endDate(): string { return this.props.endDate; }
  get registrationDeadline(): string { return this.props.registrationDeadline; }
  get locationCity(): string | undefined { return this.props.locationCity; }
  get locationCollege(): string | undefined { return this.props.locationCollege; }
  get isOnline(): boolean { return this.props.isOnline; }
  get latitude(): number | undefined { return this.props.latitude; }
  get longitude(): number | undefined { return this.props.longitude; }
  get tags(): string[] { return this.props.tags; }
  get prizePool(): string { return this.props.prizePool; }
  get prizeAmount(): number { return this.props.prizeAmount; }
  get organizer(): string { return this.props.organizer; }
  get coverImage(): string | undefined { return this.props.coverImage; }
  get logoUrl(): string | undefined { return this.props.logoUrl; }
  get status(): 'draft' | 'pending' | 'approved' | 'rejected' | 'archived' { return this.props.status; }
  get viewsCount(): number { return this.props.viewsCount; }
  get avgRating(): number { return this.props.avgRating; }
  get reviewsCount(): number { return this.props.reviewsCount; }
  get submittedBy(): string | undefined { return this.props.submittedBy; }
  get createdAt(): string { return this.props.createdAt; }
  get updatedAt(): string { return this.props.updatedAt; }

  public approve(): void {
    if (this.props.status === 'approved') return;
    this.props.status = 'approved';
    this.props.updatedAt = new Date().toISOString();
    this.incrementVersion();
  }

  public reject(): void {
    this.props.status = 'rejected';
    this.props.updatedAt = new Date().toISOString();
    this.incrementVersion();
  }

  public archive(): void {
    this.props.status = 'archived';
    this.props.updatedAt = new Date().toISOString();
    this.incrementVersion();
  }

  public incrementViews(): void {
    this.props.viewsCount += 1;
  }

  public updateRating(newRating: number, newCount: number): void {
    this.props.avgRating = newRating;
    this.props.reviewsCount = newCount;
    this.props.updatedAt = new Date().toISOString();
    this.incrementVersion();
  }

  public static create(props: HackathonProps, id?: string): HackathonAggregate {
    return new HackathonAggregate(props, id ? new UniqueId(id) : undefined);
  }
}
