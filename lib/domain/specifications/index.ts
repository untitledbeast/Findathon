import { Pagination, SearchQuery } from '../value-objects';

export interface HackathonSearchSpecificationProps {
  query?: string;
  city?: string;
  college?: string;
  tags?: string[];
  mode?: 'online' | 'offline' | 'hybrid';
  isOnline?: boolean;
  minPrize?: number;
  deadlineBefore?: Date;
  status?: string;
  isVerified?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'open';
  hasCertificate?: boolean;
  isHiring?: boolean;
  pagination: Pagination;
}

export class HackathonSearchSpecification {
  constructor(public props: HackathonSearchSpecificationProps) {}

  public getQuery(): SearchQuery {
    return new SearchQuery(this.props.query || '');
  }

  public getPagination(): Pagination {
    return this.props.pagination;
  }

  public toJSON() {
    return {
      ...this.props,
      pagination: this.props.pagination.toJSON()
    };
  }
}

export interface ReviewSpecificationProps {
  hackathonId?: string;
  userId?: string;
  minRating?: number;
  pagination: Pagination;
}

export class ReviewSpecification {
  constructor(public props: ReviewSpecificationProps) {}
}

export interface BookmarkSpecificationProps {
  userId: string;
  hackathonId?: string;
  pagination?: Pagination;
}

export class BookmarkSpecification {
  constructor(public props: BookmarkSpecificationProps) {}
}

export interface OrganizerSpecificationProps {
  organizationName?: string;
  isVerified?: boolean;
}

export class OrganizerSpecification {
  constructor(public props: OrganizerSpecificationProps) {}
}

export interface SearchSpecificationProps {
  query: string;
  tags?: string[];
  city?: string;
  mode?: string;
  pagination: Pagination;
}

export class SearchSpecification {
  constructor(public props: SearchSpecificationProps) {}
}
