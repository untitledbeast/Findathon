import { DomainEvent } from './event-types';
import { defaultQueueProvider, IEventQueueProvider } from './memory-queue.provider';

export class EventBus {
  constructor(private queueProvider: IEventQueueProvider = defaultQueueProvider) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.queueProvider.enqueue(event);
  }

  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    this.queueProvider.subscribe(eventName, handler);
  }
}

export const eventBus = new EventBus();
