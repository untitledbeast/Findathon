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

export interface HackathonUpdatedEvent extends BaseDomainEvent {
  eventName: 'HackathonUpdated';
  hackathonId: string;
  title: string;
}

export interface HackathonPublishedEvent extends BaseDomainEvent {
  eventName: 'HackathonPublished';
  hackathonId: string;
  title: string;
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

export interface NotificationCreatedEvent extends BaseDomainEvent {
  eventName: 'NotificationCreated';
  notificationId: string;
  userId: string;
  type: string;
}

export type DomainEvent =
  | HackathonCreatedEvent
  | HackathonUpdatedEvent
  | HackathonPublishedEvent
  | ReviewCreatedEvent
  | BookmarkCreatedEvent
  | NotificationCreatedEvent;

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;
