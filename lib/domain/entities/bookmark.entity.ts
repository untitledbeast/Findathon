export interface BookmarkEntityProps {
  id: string;
  userId: string;
  hackathonId: string;
  savedAt: Date;
}

export class BookmarkEntity {
  constructor(private props: BookmarkEntityProps) {}

  public get id(): string { return this.props.id; }
  public get userId(): string { return this.props.userId; }
  public get hackathonId(): string { return this.props.hackathonId; }
  public get savedAt(): Date { return this.props.savedAt; }

  public toProps(): BookmarkEntityProps { return { ...this.props }; }
}
