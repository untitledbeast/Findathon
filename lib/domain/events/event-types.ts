export interface BaseDomainEvent {
  eventId: string;
  eventName: string;
  timestamp: string;
  userId?: string;
}

export interface HackathonCreatedEvent extends BaseDomainEvent {
  eventName: 'HackathonCreated';
  hackathonId: string;
  title: string;
  organizerName: string;
}

export interface ReviewCreatedEvent extends BaseDomainEvent {
  eventName: 'ReviewCreated';
  reviewId: string;
  hackathonId: string;
  rating: number;
}

export interface BookmarkCreatedEvent extends BaseDomainEvent {
  eventName: 'BookmarkCreated';
  hackathonId: string;
  userId: string;
}

export interface UserFollowedOrganizerEvent extends BaseDomainEvent {
  eventName: 'UserFollowedOrganizer';
  organizerId: string;
  userId: string;
}

export type DomainEvent =
  | HackathonCreatedEvent
  | ReviewCreatedEvent
  | BookmarkCreatedEvent
  | UserFollowedOrganizerEvent;
