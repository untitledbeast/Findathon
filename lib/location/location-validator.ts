import { GeocodeResult } from './types';

export class LocationValidator {
  /**
   * Validates if numeric latitude and longitude represent valid geographic coordinates.
   */
  public static isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return false;
    }
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }
    if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
      return false;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return false;
    }
    // Reject Null Island (0, 0)
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      return false;
    }

    return true;
  }

  /**
   * Validates geocode result before storing or rendering.
   */
  public static validateResult(
    result: GeocodeResult | null,
    expectedCountry = 'India'
  ): { isValid: boolean; reason?: string } {
    if (!result) {
      return { isValid: false, reason: 'Geocoder returned no results' };
    }

    if (!this.isValidCoordinate(result.latitude, result.longitude)) {
      return { isValid: false, reason: 'Invalid or out-of-bounds coordinates' };
    }

    if (result.confidence < 0.40) {
      return { isValid: false, reason: `Confidence score (${result.confidence}) is below minimum threshold (0.40)` };
    }

    // If expected country is India, verify coordinates fall within Indian subcontinental bounds
    if (expectedCountry.toLowerCase() === 'india') {
      const lat = result.latitude;
      const lng = result.longitude;
      // India approximate geographic bounding box: 6.0 to 37.5 N, 68.0 to 97.5 E
      if (lat < 5.0 || lat > 38.0 || lng < 67.0 || lng > 98.0) {
        // Exception: allow if result country is explicitly India
        if (!result.country || !result.country.toLowerCase().includes('india')) {
          return { isValid: false, reason: 'Geocoded coordinates fall outside expected geographic region for India' };
        }
      }
    }

    return { isValid: true };
  }
}
