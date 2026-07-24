import { HACKATHON_STATUS, HackathonStatus } from '@/constants/status';

export interface HackathonEntityProps {
  id: string;
  title: string;
  description: string;
  tagline: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  status: HackathonStatus;
  maxParticipants: number | null;
  currentParticipants: number;
  isVerified: boolean;
  prizeAmount: number;
}

export class HackathonEntity {
  constructor(public props: HackathonEntityProps) {}

  public get id(): string { return this.props.id; }
  public get title(): string { return this.props.title; }
  public get status(): HackathonStatus { return this.props.status; }

  public approve(): void {
    if (this.props.status === HACKATHON_STATUS.ARCHIVED) {
      throw new Error('Cannot approve an archived hackathon');
    }
    this.props.status = HACKATHON_STATUS.APPROVED;
  }

  public archive(): void {
    this.props.status = HACKATHON_STATUS.ARCHIVED;
  }

  public publish(): void {
    this.props.status = HACKATHON_STATUS.APPROVED;
  }

  public isRegistrationOpen(): boolean {
    if (this.props.status !== HACKATHON_STATUS.APPROVED) return false;
    if (this.props.registrationDeadline && new Date(this.props.registrationDeadline).getTime() < Date.now()) {
      return false;
    }
    if (new Date(this.props.startDate).getTime() < Date.now()) {
      return false;
    }
    if (this.isFull()) return false;
    return true;
  }

  public isFull(): boolean {
    if (!this.props.maxParticipants) return false;
    return this.props.currentParticipants >= this.props.maxParticipants;
  }

  public calculateQualityScore(): number {
    let score = 50;
    if (this.props.description.length > 500) score += 15;
    if (this.props.isVerified) score += 20;
    if (this.props.prizeAmount > 10000) score += 15;
    return Math.min(100, score);
  }
}
