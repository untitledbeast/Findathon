export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export class SpatialSpecification {
  constructor(public readonly bounds: ViewportBounds) {}

  public isSatisfiedBy(item: { latitude?: number; longitude?: number }): boolean {
    if (item.latitude === undefined || item.longitude === undefined) {
      return false;
    }
    return (
      item.latitude >= this.bounds.south &&
      item.latitude <= this.bounds.north &&
      item.longitude >= this.bounds.west &&
      item.longitude <= this.bounds.east
    );
  }
}
