import { UniqueId } from './UniqueId';

export abstract class Entity<T> {
  protected readonly _id: UniqueId;
  public readonly props: T;

  constructor(props: T, id?: UniqueId) {
    this._id = id ? id : new UniqueId();
    this.props = props;
  }

  get id(): UniqueId {
    return this._id;
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    return this._id.equals(object._id);
  }
}
