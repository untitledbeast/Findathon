import { ValidationError } from '@/lib/errors';
import { USER_ROLES, UserRole } from '@/constants/roles';
import { HACKATHON_STATUS, HackathonStatus as HackathonStatusType } from '@/constants/status';

export class Slug {
  private readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError('Slug cannot be empty');
    }
    const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!sanitized) {
      throw new ValidationError('Invalid slug format');
    }
    this.value = sanitized;
  }

  public getValue(): string { return this.value; }
  public equals(other?: Slug | null): boolean { return !!other && other.getValue() === this.value; }
  public toString(): string { return this.value; }
  public toJSON(): string { return this.value; }
}

export class Email {
  private readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('Email is required');
    }
    const trimmed = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new ValidationError(`Invalid email address: ${value}`);
    }
    this.value = trimmed;
  }

  public getValue(): string { return this.value; }
  public equals(other?: Email | null): boolean { return !!other && other.getValue() === this.value; }
  public toString(): string { return this.value; }
  public toJSON(): string { return this.value; }
}

export class Url {
  private readonly value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('URL is required');
    }
    const trimmed = value.trim();
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol.toLowerCase())) {
        throw new Error('Must be http or https');
      }
      // Prohibit dangerous hostnames
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
        throw new Error('Localhost URLs are not permitted');
      }
      this.value = parsed.toString();
    } catch {
      throw new ValidationError(`Invalid URL: ${value}`);
    }
  }

  public getValue(): string { return this.value; }
  public equals(other?: Url | null): boolean { return !!other && other.getValue() === this.value; }
  public toString(): string { return this.value; }
  public toJSON(): string { return this.value; }
}

export class Money {
  private readonly amount: number;
  private readonly currency: string;

  constructor(amount: number, currency: string = 'INR') {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      throw new ValidationError('Money amount must be a non-negative number');
    }
    if (!currency || typeof currency !== 'string') {
      throw new ValidationError('Currency code is required');
    }
    this.amount = amount;
    this.currency = currency.trim().toUpperCase();
  }

  public getAmount(): number { return this.amount; }
  public getCurrency(): string { return this.currency; }
  public equals(other?: Money | null): boolean {
    return !!other && other.getAmount() === this.amount && other.getCurrency() === this.currency;
  }
  public toString(): string {
    const symbol = this.currency === 'INR' ? '₹' : this.currency === 'USD' ? '$' : `${this.currency} `;
    return `${symbol}${this.amount.toLocaleString('en-US')}`;
  }
  public toJSON(): { amount: number; currency: string } {
    return { amount: this.amount, currency: this.currency };
  }
}

export class PrizePool {
  private readonly formatted: string;
  private readonly numericAmount: number;
  private readonly currency: string | null;

  constructor(raw: string | number | null | undefined, currency?: string | null, formattedOverride?: string) {
    if (formattedOverride) {
      this.formatted = formattedOverride.trim();
      this.numericAmount = typeof raw === 'number' ? raw : (parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0);
      this.currency = currency || (formattedOverride.includes('₹') ? 'INR' : formattedOverride.includes('$') ? 'USD' : null);
    } else if (typeof raw === 'number') {
      if (raw < 0) throw new ValidationError('Prize pool amount cannot be negative');
      this.numericAmount = raw;
      const curr = (currency || 'USD').toUpperCase();
      this.currency = curr;
      const symbol = curr === 'INR' ? '₹' : curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : `${curr} `;
      this.formatted = `${symbol}${raw.toLocaleString('en-US')}`;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.toLowerCase() === 'tbd' || trimmed.toLowerCase() === 'null') {
        this.formatted = 'TBD';
        this.numericAmount = 0;
        this.currency = null;
      } else {
        this.formatted = trimmed;
        const nums = trimmed.replace(/[^0-9.]/g, '');
        this.numericAmount = nums ? parseFloat(nums) : 0;
        if (currency) {
          this.currency = currency.toUpperCase();
        } else if (trimmed.includes('₹') || trimmed.toUpperCase().includes('INR')) {
          this.currency = 'INR';
        } else if (trimmed.includes('$') || trimmed.toUpperCase().includes('USD')) {
          this.currency = 'USD';
        } else if (trimmed.includes('€') || trimmed.toUpperCase().includes('EUR')) {
          this.currency = 'EUR';
        } else if (trimmed.includes('£') || trimmed.toUpperCase().includes('GBP')) {
          this.currency = 'GBP';
        } else {
          this.currency = null;
        }
      }
    } else {
      this.formatted = 'TBD';
      this.numericAmount = 0;
      this.currency = null;
    }
  }

  public getFormatted(): string { return this.formatted; }
  public getNumericAmount(): number { return this.numericAmount; }
  public getCurrency(): string | null { return this.currency; }
  public equals(other?: PrizePool | null): boolean { return !!other && other.getFormatted() === this.formatted; }
  public toString(): string { return this.formatted; }
  public toJSON(): { formatted: string; numericAmount: number; currency: string | null } {
    return { formatted: this.formatted, numericAmount: this.numericAmount, currency: this.currency };
  }
}

export class Rating {
  private readonly score: number;

  constructor(score: number) {
    if (typeof score !== 'number' || isNaN(score) || score < 1 || score > 5) {
      throw new ValidationError('Rating score must be an integer between 1 and 5');
    }
    this.score = Math.round(score);
  }

  public getValue(): number { return this.score; }
  public equals(other?: Rating | null): boolean { return !!other && other.getValue() === this.score; }
  public toString(): string { return `${this.score}/5`; }
  public toJSON(): number { return this.score; }
}

export class Coordinates {
  private readonly latitude: number;
  private readonly longitude: number;

  constructor(lat: number, lng: number) {
    if (typeof lat !== 'number' || isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
      throw new ValidationError(`Latitude must be between -90 and 90. Got: ${lat}`);
    }
    if (typeof lng !== 'number' || isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
      throw new ValidationError(`Longitude must be between -180 and 180. Got: ${lng}`);
    }
    this.latitude = lat;
    this.longitude = lng;
  }

  public getLatitude(): number { return this.latitude; }
  public getLongitude(): number { return this.longitude; }
  public equals(other?: Coordinates | null): boolean {
    return !!other && other.getLatitude() === this.latitude && other.getLongitude() === this.longitude;
  }
  public toJSON(): { latitude: number; longitude: number } {
    return { latitude: this.latitude, longitude: this.longitude };
  }
}

export class Location {
  private readonly city?: string;
  private readonly venueName?: string;
  private readonly fullAddress?: string;
  private readonly coordinates?: Coordinates;
  private readonly isOnline: boolean;

  constructor(props: {
    city?: string | null;
    venueName?: string | null;
    venue?: string | null;
    college?: string | null;
    locationCollege?: string | null;
    locationCity?: string | null;
    fullAddress?: string | null;
    address?: string | null;
    coordinates?: Coordinates | null;
    isOnline: boolean;
  }) {
    this.isOnline = props.isOnline;
    const resolvedCity = (props.city || props.locationCity || '').trim();
    const resolvedVenue = (props.venueName || props.venue || props.college || props.locationCollege || '').trim();
    const resolvedAddress = (props.fullAddress || props.address || '').trim();

    if (!props.isOnline) {
      if (!resolvedCity) {
        throw new ValidationError('City location is required for in-person / hybrid events');
      }
      if (!resolvedVenue && !resolvedAddress) {
        throw new ValidationError('Venue name or address is required for in-person / hybrid events');
      }
    }

    this.city = resolvedCity || undefined;
    this.venueName = resolvedVenue || undefined;
    this.fullAddress = resolvedAddress || undefined;
    this.coordinates = props.isOnline ? undefined : (props.coordinates || undefined);
  }

  public getCity(): string | undefined { return this.city; }
  public getVenueName(): string | undefined { return this.venueName; }
  public getCollege(): string | undefined { return this.venueName; } // backward-compatible alias
  public getFullAddress(): string | undefined { return this.fullAddress; }
  public getCoordinates(): Coordinates | undefined { return this.coordinates; }
  public getIsOnline(): boolean { return this.isOnline; }

  public equals(other?: Location | null): boolean {
    return !!other &&
      other.getIsOnline() === this.isOnline &&
      other.getCity() === this.city &&
      other.getVenueName() === this.venueName;
  }

  public toJSON() {
    return {
      city: this.city || null,
      venueName: this.venueName || null,
      college: this.venueName || null,
      fullAddress: this.fullAddress || null,
      coordinates: this.coordinates ? this.coordinates.toJSON() : null,
      isOnline: this.isOnline
    };
  }
}

export class DateRange {
  private readonly startDate: Date;
  private readonly endDate: Date;

  constructor(start: Date | string, end: Date | string) {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime())) throw new ValidationError('Invalid start date');
    if (isNaN(e.getTime())) throw new ValidationError('Invalid end date');
    if (e.getTime() < s.getTime()) {
      throw new ValidationError('End date must be after or on start date');
    }
    this.startDate = s;
    this.endDate = e;
  }

  public getStartDate(): Date { return new Date(this.startDate); }
  public getEndDate(): Date { return new Date(this.endDate); }
  public getDurationDays(): number {
    return Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  public equals(other?: DateRange | null): boolean {
    return !!other && other.getStartDate().getTime() === this.startDate.getTime() && other.getEndDate().getTime() === this.endDate.getTime();
  }
  public toJSON() {
    return { startDate: this.startDate.toISOString(), endDate: this.endDate.toISOString() };
  }
}

export class RegistrationWindow {
  private readonly deadline: Date;
  private readonly dateRange: DateRange;

  constructor(deadline: Date | string, dateRange: DateRange) {
    const d = new Date(deadline);
    if (isNaN(d.getTime())) throw new ValidationError('Invalid registration deadline date');
    if (d.getTime() > dateRange.getStartDate().getTime()) {
      throw new ValidationError('Registration deadline must be before or on event start date');
    }
    this.deadline = d;
    this.dateRange = dateRange;
  }

  public getDeadline(): Date { return new Date(this.deadline); }
  public isClosed(atDate: Date = new Date()): boolean {
    return atDate.getTime() > this.deadline.getTime();
  }
  public equals(other?: RegistrationWindow | null): boolean {
    return !!other && other.getDeadline().getTime() === this.deadline.getTime();
  }
  public toJSON() {
    return { deadline: this.deadline.toISOString(), dateRange: this.dateRange.toJSON() };
  }
}

export class TeamSize {
  private readonly minSize: number;
  private readonly maxSize: number;
  private readonly soloAllowed: boolean;

  constructor(minSize: number = 1, maxSize: number = 4, soloAllowed: boolean = true) {
    if (minSize < 1 || minSize > 10) throw new ValidationError('Min team size must be between 1 and 10');
    if (maxSize < minSize || maxSize > 10) throw new ValidationError('Max team size must be between minSize and 10');
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.soloAllowed = soloAllowed;
  }

  public getMinSize(): number { return this.minSize; }
  public getMaxSize(): number { return this.maxSize; }
  public isSoloAllowed(): boolean { return this.soloAllowed; }
  public equals(other?: TeamSize | null): boolean {
    return !!other && other.getMinSize() === this.minSize && other.getMaxSize() === this.maxSize && other.isSoloAllowed() === this.soloAllowed;
  }
  public toJSON() {
    return { minSize: this.minSize, maxSize: this.maxSize, soloAllowed: this.soloAllowed };
  }
}

export class SearchQuery {
  private readonly value: string;

  constructor(query: string = '') {
    this.value = query.trim();
  }

  public getValue(): string { return this.value; }
  public isEmpty(): boolean { return this.value.length === 0; }
  public equals(other?: SearchQuery | null): boolean { return !!other && other.getValue() === this.value; }
  public toString(): string { return this.value; }
  public toJSON(): string { return this.value; }
}

export class Permission {
  private readonly name: string;

  constructor(name: string) {
    if (!name || typeof name !== 'string') throw new ValidationError('Permission name is required');
    this.name = name.trim().toLowerCase();
  }

  public getName(): string { return this.name; }
  public equals(other?: Permission | null): boolean { return !!other && other.getName() === this.name; }
  public toString(): string { return this.name; }
}

export class Role {
  private readonly value: UserRole;

  constructor(role: string) {
    const validRoles = Object.values(USER_ROLES);
    const normalized = role?.toLowerCase() as UserRole;
    if (!validRoles.includes(normalized)) {
      throw new ValidationError(`Invalid role: ${role}`);
    }
    this.value = normalized;
  }

  public getValue(): UserRole { return this.value; }
  public isAdmin(): boolean { return this.value === USER_ROLES.ADMIN; }
  public isModerator(): boolean { return this.value === USER_ROLES.MODERATOR; }
  public isOrganizer(): boolean { return this.value === USER_ROLES.ORGANIZER; }
  public equals(other?: Role | null): boolean { return !!other && other.getValue() === this.value; }
  public toString(): string { return this.value; }
}

export class Pagination {
  private readonly page: number;
  private readonly pageSize: number;

  constructor(page: number = 1, pageSize: number = 12) {
    if (page < 1) throw new ValidationError('Page number must be at least 1');
    if (pageSize < 1 || pageSize > 50) throw new ValidationError('Page size must be between 1 and 50');
    this.page = Math.floor(page);
    this.pageSize = Math.floor(pageSize);
  }

  public getPage(): number { return this.page; }
  public getPageSize(): number { return this.pageSize; }
  public getOffset(): number { return (this.page - 1) * this.pageSize; }
  public equals(other?: Pagination | null): boolean {
    return !!other && other.getPage() === this.page && other.getPageSize() === this.pageSize;
  }
  public toJSON() {
    return { page: this.page, pageSize: this.pageSize, offset: this.getOffset() };
  }
}

export class HackathonStatusState {
  private readonly current: HackathonStatusType;

  constructor(status: string = HACKATHON_STATUS.PENDING) {
    const valid = Object.values(HACKATHON_STATUS);
    const normalized = status?.toLowerCase() as HackathonStatusType;
    if (!valid.includes(normalized)) {
      throw new ValidationError(`Invalid hackathon status: ${status}`);
    }
    this.current = normalized;
  }

  public getValue(): HackathonStatusType { return this.current; }
  public isApproved(): boolean { return this.current === HACKATHON_STATUS.APPROVED; }
  public isPending(): boolean { return this.current === HACKATHON_STATUS.PENDING; }
  public isRejected(): boolean { return this.current === HACKATHON_STATUS.REJECTED; }
  public isArchived(): boolean { return this.current === HACKATHON_STATUS.ARCHIVED; }

  public canTransitionTo(next: HackathonStatusType): boolean {
    if (this.current === next) return true;
    switch (this.current) {
      case HACKATHON_STATUS.PENDING:
        return ([HACKATHON_STATUS.APPROVED, HACKATHON_STATUS.REJECTED, HACKATHON_STATUS.ARCHIVED] as HackathonStatusType[]).includes(next);
      case HACKATHON_STATUS.APPROVED:
        return ([HACKATHON_STATUS.ARCHIVED, HACKATHON_STATUS.REJECTED] as HackathonStatusType[]).includes(next);
      case HACKATHON_STATUS.REJECTED:
        return ([HACKATHON_STATUS.PENDING, HACKATHON_STATUS.ARCHIVED] as HackathonStatusType[]).includes(next);
      case HACKATHON_STATUS.ARCHIVED:
        return false;
      default:
        return false;
    }
  }

  public transitionTo(next: HackathonStatusType): HackathonStatusState {
    if (!this.canTransitionTo(next)) {
      throw new ValidationError(`Cannot transition hackathon status from ${this.current} to ${next}`);
    }
    return new HackathonStatusState(next);
  }

  public equals(other?: HackathonStatusState | null): boolean { return !!other && other.getValue() === this.current; }
  public toString(): string { return this.current; }
}

export * from './skill-score';
export * from './developer-skill-profile';

