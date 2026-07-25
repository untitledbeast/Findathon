export interface NotificationEntityProps {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class NotificationEntity {
  constructor(private props: NotificationEntityProps) {}

  public get id(): string { return this.props.id; }
  public get userId(): string { return this.props.userId; }
  public get type(): string { return this.props.type; }
  public get title(): string { return this.props.title; }
  public get body(): string { return this.props.body; }
  public get isRead(): boolean { return this.props.isRead; }
  public get metadata(): Record<string, unknown> { return { ...this.props.metadata }; }
  public get createdAt(): Date { return this.props.createdAt; }

  public markAsRead(): void {
    this.props.isRead = true;
  }

  public toProps(): NotificationEntityProps { return { ...this.props }; }
}
