import { UniqueId } from './UniqueId';

export interface IDomainEvent {
  dateTimeOccurred: Date;
  getAggregateId(): UniqueId;
}
