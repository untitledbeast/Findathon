export interface UserBlockEntityProps {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: number;
}

export class UserBlockEntity {
  constructor(private readonly props: UserBlockEntityProps) {}

  public get id(): string { return this.props.id; }
  public get blockerUserId(): string { return this.props.blockerUserId; }
  public get blockedUserId(): string { return this.props.blockedUserId; }
  public get createdAt(): number { return this.props.createdAt; }

  public toJSON(): UserBlockEntityProps {
    return { ...this.props };
  }
}
