import { DomainEvent } from './event-types';

export interface IEventQueueProvider {
  enqueue(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void;
}

export class MemoryQueueProvider implements IEventQueueProvider {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  async enqueue(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.eventName) || [];
    for (const handler of list) {
      Promise.resolve().then(() => handler(event)).catch(err => {
        console.error(`MemoryQueue Error handling ${event.eventName}:`, err);
      });
    }
  }

  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }
}

export const defaultQueueProvider = new MemoryQueueProvider();
