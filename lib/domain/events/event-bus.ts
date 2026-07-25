import { DomainEvent, DomainEventHandler } from './event-types';

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: DomainEventHandler): () => void;
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<DomainEventHandler>>();

  public async publish(event: DomainEvent): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventName);
    if (!eventHandlers || eventHandlers.size === 0) return;

    const promises = Array.from(eventHandlers).map(handler => {
      try {
        return Promise.resolve(handler(event));
      } catch (err) {
        console.error(`Error handling domain event ${event.eventName}:`, err);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  public subscribe(eventName: string, handler: DomainEventHandler): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    const set = this.handlers.get(eventName)!;
    set.add(handler);

    return () => {
      set.delete(handler);
    };
  }
}

export const eventBus = new InMemoryEventBus();
