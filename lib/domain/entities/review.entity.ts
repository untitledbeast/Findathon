import { Rating } from '../value-objects';

export interface ReviewEntityProps {
  id: string;
  hackathonId: string;
  userId: string;
  rating: Rating;
  title: string;
  body: string;
  organizationQuality: Rating;
  prizeTransparency: Rating;
  mentorship: Rating;
  createdAt: Date;
  updatedAt: Date;
}

export class ReviewEntity {
  constructor(private props: ReviewEntityProps) {}

  public get id(): string { return this.props.id; }
  public get hackathonId(): string { return this.props.hackathonId; }
  public get userId(): string { return this.props.userId; }
  public get rating(): Rating { return this.props.rating; }
  public get title(): string { return this.props.title; }
  public get body(): string { return this.props.body; }
  public get organizationQuality(): Rating { return this.props.organizationQuality; }
  public get prizeTransparency(): Rating { return this.props.prizeTransparency; }
  public get mentorship(): Rating { return this.props.mentorship; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  public getOverallAverage(): number {
    const scores = [
      this.props.rating.getValue(),
      this.props.organizationQuality.getValue(),
      this.props.prizeTransparency.getValue(),
      this.props.mentorship.getValue()
    ];
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }

  public toProps(): ReviewEntityProps { return { ...this.props }; }
}
